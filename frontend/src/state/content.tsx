// Admin-managed app content, fetched from GET /content at launch; built-in lists are the offline fallback.
import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "../api/client";
import { ACCESSORIES, BRANDS, ENCLOSURE_TYPES, PERGOLA_TYPES } from "./requestDraft";

export interface Pair { label: string; code: string }
export interface Content {
  pergola_types: string[]; brands: string[]; enclosure_types: Pair[]; accessories: Pair[]; pergola_systems: string[]; electronics_devices: string[];
  home_promo: { label: string; title: string; sub: string; cta: string; enabled: boolean }; care_tips: Record<string, string>; faq_pro: [string, string][]; support: { phone: string; email: string; hours?: string };
  categories: { slug: string; name: string; description?: string | null; requires_practical: boolean }[]; version?: string;
}
export const FALLBACK: Content = {
  pergola_types: PERGOLA_TYPES, brands: BRANDS,
  enclosure_types: ENCLOSURE_TYPES.map((label) => ({ label, code: /screen/i.test(label) ? "screen" : /glass|window|door/i.test(label) ? "glass" : /railing/i.test(label) ? "railing" : "privacy_wall" })),
  accessories: ACCESSORIES.map((label) => ({ label, code: ({ "LED Lights": "led_lighting", Fan: "fan", "Electric Heater": "electric_heater", "Gas Heater": "gas_heater", Speakers: "speaker", "Smart Controls / Remote": "motor_controls", "Rain & Wind Sensor": "sensor", "Privacy Curtains": "curtains" } as Record<string, string>)[label] ?? label.toLowerCase().replace(/\W+/g, "_") })),
  pergola_systems: ["Suntent", "StruXure", "Alumawood", "Renson", "Azenco", "Other"], electronics_devices: ["Drive motor (roof louvers)", "Gearbox", "Rain sensor", "Wind sensor", "Sun sensor", "Remote control", "Wall controller", "Power supply / transformer", "Control board", "LED driver / dimmer"],
  home_promo: { label: "Limited offer", title: "50% off care plans", sub: "Members offer · this season", cta: "View MrCare plans", enabled: true },
  care_tips: { rain: "Rain is expected. Check that your gutters and drainage outlets are clear of leaves and debris.", thunder: "Thunderstorms in the area. Keep clear of the structure during lightning and consider switching off mounted electrical accessories at the source.", snow: "Snow is expected. Follow your manufacturer's snow-load and roof-operation guidance; clear accumulation only as they advise.", windy: "Strong winds are forecast. Retract zip screens before gusts arrive and follow your manufacturer's guidance.", sunny: "Sunny days ahead. Check that your screens are clean and operating smoothly.", partly: "Mild conditions. A good time for a quick visual check of louvers, gutters and fixings." },
  faq_pro: [], support: { phone: "(800) 555-0199", email: "support@mrbuilder.com" }, categories: [],
};
const Ctx = createContext<Content>(FALLBACK);
export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<Content>(FALLBACK);
  useEffect(() => { (async () => {
    try { const cached = await SecureStore.getItemAsync("mrb_content"); if (cached) setContent({ ...FALLBACK, ...JSON.parse(cached) }); } catch {}
    const r = await api<Partial<Content>>("/content");
    if (r.success && r.data) { const merged = { ...FALLBACK, ...r.data }; setContent(merged); SecureStore.setItemAsync("mrb_content", JSON.stringify(r.data).slice(0, 1900)).catch(() => {}); }
  })(); }, []);
  return <Ctx.Provider value={content}>{children}</Ctx.Provider>;
}
export const useContent = () => useContext(Ctx);
