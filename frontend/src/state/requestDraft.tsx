// In-memory draft of an installation request (pergolas list) shared between form and Add-pergola screens.
import React, { createContext, useContext, useState } from "react";

export interface Enclosure { type: string; w: string; l: string; h: string; loc?: string }
export interface PergolaSpec { key: string; type: string; brand: string; name: string; units: "ft" | "m"; w: string; l: string; h: string; attach: "attached" | "detached"; encOn: boolean; enc: Enclosure[]; footOn: boolean; footN: string; footReady: boolean; acc: Record<string, number>; photos: string[]; plans: string[] }
export const emptyPergola = (): PergolaSpec => ({ key: String(Date.now()), type: "", brand: "", name: "", units: "ft", w: "", l: "", h: "", attach: "attached", encOn: false, enc: [], footOn: false, footN: "", footReady: true, acc: {}, photos: [], plans: [] });

const Ctx = createContext<{ pergolas: PergolaSpec[]; upsert: (p: PergolaSpec) => void; remove: (key: string) => void; reset: () => void }>(null as never);
export function RequestDraftProvider({ children }: { children: React.ReactNode }) {
  const [pergolas, setPergolas] = useState<PergolaSpec[]>([]);
  return <Ctx.Provider value={{ pergolas, upsert: (p) => setPergolas((l) => (l.some((x) => x.key === p.key) ? l.map((x) => (x.key === p.key ? p : x)) : [...l, p])), remove: (key) => setPergolas((l) => l.filter((x) => x.key !== key)), reset: () => setPergolas([]) }}>{children}</Ctx.Provider>;
}
export const useRequestDraft = () => useContext(Ctx);

export const PERGOLA_TYPES = ["Louvered — Tilt Only", "Louvered — Retractable", "Retractable Fabric Roof", "Fixed Fabric Roof", "Fixed Solid Roof", "Fixed Glass Roof", "Retractable Glass Roof", "Polycarbonate Roof", "Solar Panel Roof", "Open Slat / Lattice", "Other", "Not Sure"];
export const BRANDS = ["Abrisud", "AKENA", "AlunoTec", "Americana Outdoors", "Artent", "Australian Outdoor Living", "Azenco", "Backyard Discovery", "Biossun", "Bon Pergola", "Brustor", "Byart", "Corradi", "Coublanc", "Equinox", "Fillonneau", "FlexPatio", "Gardendreams", "Gibus", "Gustave Rideau", "Hansø Home", "KE Outdoor Design", "Louvretec", "Mirador", "Nerli Gruppen", "OWEADO", "Palmiye", "Pergola A.Ş.", "Pergola Cave", "PERGOLUX", "Pergoroof", "PONARC", "Pratic", "Prefabex", "Progolas", "Purple Leaf", "Renson", "Rising Global", "Royal Class Tente", "Saxun", "Seroban", "Sky Art Shading", "Soko", "Solisystème", "STOBAG", "Stratco", "Structureworks", "StruXure", "Sunroomy", "Sunsystem", "SunTent", "Tarasola", "Tenteks", "The Luxury Pergola", "Toja Grid", "Trex Pergola", "Trueline", "Unopiù", "Weinor", "Other"];
export const ENCLOSURE_TYPES = ["Motorized Guillotine Window", "Manual Guillotine Window", "Bi-Fold Door", "Sliding Door", "Lift & Slide Door", "French Door", "Fixed Glass Wall", "Roll-Up Zip Screen", "Fixed Aluminum Composite Wall", "Glass Railing", "Aluminum Railing", "Mosquito Screen"];
export const ACCESSORIES = ["LED Lights", "Fan", "Electric Heater", "Gas Heater", "Speakers", "Smart Controls / Remote", "Rain & Wind Sensor", "Privacy Curtains"];
export const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// map the client's catalogue onto the pricing engine's codes
export const structureCode = (t: string) => /louvered/i.test(t) ? "louvered" : /retractable/i.test(t) ? "retractable" : "fixed_roof";
export const enclosureCode = (t: string) => /screen/i.test(t) ? "screen" : /glass|window|door/i.test(t) ? "glass" : /railing/i.test(t) ? "railing" : "privacy_wall";
export const accessoryCode = (a: string) => ({ "LED Lights": "led_lighting", Fan: "fan", "Electric Heater": "electric_heater", "Gas Heater": "gas_heater", Speakers: "speaker", "Smart Controls / Remote": "motor_controls", "Rain & Wind Sensor": "sensor", "Privacy Curtains": "curtains" }[a] ?? a.toLowerCase().replace(/\W+/g, "_"));
export const toFt = (v: string, units: "ft" | "m") => { const n = parseFloat(v); if (isNaN(n)) return undefined; return units === "m" ? Math.round(n * 3.28084 * 100) / 100 : n; };
export const specPayload = (p: PergolaSpec) => ({
  title: p.name || undefined, mounting: p.attach === "attached" ? "attached" : "free_standing", width_ft: toFt(p.w, p.units), length_ft: toFt(p.l, p.units), height_ft: toFt(p.h, p.units),
  pergola_spec: { structure_type: structureCode(p.type), type: p.type, brand: p.brand, enclosures: p.encOn ? p.enc.map((e) => ({ type: enclosureCode(e.type), label: e.type, width_ft: toFt(e.w, p.units), length_ft: toFt(e.l, p.units), height_ft: toFt(e.h, p.units), location: e.loc })) : [],
    accessories: Object.entries(p.acc).filter(([, n]) => n > 0).map(([k, qty]) => ({ type: accessoryCode(k), label: k, qty })), footings: { involved: p.footOn, ready: p.footReady, count: Number(p.footN || 0) }, photos: p.photos, plans: p.plans },
});
