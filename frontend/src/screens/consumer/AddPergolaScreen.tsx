import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Field, PrimaryButton, SecondaryButton } from "../../components/form";
import { ChoiceRow, Header, Note, PickerSheet, Section, SelectField, Toggle } from "../../components/sheet";
import { ACCESSORIES, BRANDS, ENCLOSURE_TYPES, Enclosure, PERGOLA_TYPES, PergolaSpec, emptyPergola, useRequestDraft } from "../../state/requestDraft";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { uploadFile } from "../../api/client";

export default function AddPergolaScreen() {
  const nav = useNavigation();
  const { params } = useRoute<{ key: string; name: string; params: { key?: string } }>();
  const { pergolas, upsert } = useRequestDraft();
  const { c } = useTheme();
  const [p, setP] = useState<PergolaSpec>(() => pergolas.find((x) => x.key === params?.key) ?? emptyPergola());
  const [pick, setPick] = useState<null | "type" | "brand" | "encType">(null);
  const [ed, setEd] = useState<(Enclosure & { i: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const unit = p.units;
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const Dim = ({ label, k, small }: { label: string; k: "w" | "l" | "h"; small?: boolean }) => (
    <View style={{ flex: 1, gap: small ? 4 : 6 }}><RNText style={S(small ? 12 : 13, "600", c.text2)}>{label}</RNText><View><TextInput value={ed && small ? ed[k] : p[k]} onChangeText={(v) => (ed && small ? setEd({ ...ed, [k]: v }) : setP({ ...p, [k]: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={c.text4} style={{ height: small ? 44 : 52, borderRadius: small ? 10 : 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, paddingLeft: 12, paddingRight: 34, fontFamily: font.regular, fontSize: small ? 14 : 15, color: c.text }} /><RNText style={{ position: "absolute", right: 12, top: small ? 14 : 18, ...S(12, "600", c.text4) }}>{unit}</RNText></View></View>
  );
  const valid = p.type && p.name.trim() && p.w && p.l && p.h;

  async function addPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true, selectionLimit: 6 });
    if (res.canceled) return;
    setBusy(true);
    const urls: string[] = [];
    for (const a of res.assets) { const u = await uploadFile(a.uri, "evidence"); urls.push(u ?? a.uri); }
    setBusy(false);
    setP({ ...p, photos: [...p.photos, ...urls] });
  }
  function save() { if (!valid) { Alert.alert("Missing details", "Type, name and dimensions are required."); return; } upsert(p); nav.goBack(); }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={params?.key ? "Edit pergola" : "Add a pergola"} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        <Section title="Pergola">
          <SelectField label="Type" value={p.type} placeholder="Select pergola type" onPress={() => setPick("type")} />
          <SelectField label="Brand" value={p.brand} placeholder="Select brand (optional)" onPress={() => setPick("brand")} />
          <Field label="Name it" value={p.name} onChangeText={(v) => setP({ ...p, name: v })} placeholder="Backyard pergola" />
          <RNText style={{ ...S(12, "400", c.text4), marginTop: -8 }}>e.g. "Backyard pergola" — helps you tell them apart.</RNText>
        </Section>
        <Section title={`Dimensions (${unit})`} right={<View style={{ flexDirection: "row", backgroundColor: c.surface3, borderRadius: 9, padding: 3 }}>{(["ft", "m"] as const).map((u) => <Pressable key={u} onPress={() => setP({ ...p, units: u })} style={{ height: 30, paddingHorizontal: 10, borderRadius: 7, backgroundColor: unit === u ? c.surface : "transparent", justifyContent: "center" }}><RNText style={S(12.5, "600", unit === u ? c.text : c.text4)}>{u === "ft" ? "ft / in" : "m / cm"}</RNText></Pressable>)}</View>}>
          <View style={{ flexDirection: "row", gap: 8 }}><Dim label="Width" k="w" /><Dim label="Length" k="l" /><Dim label="Height" k="h" /></View>
        </Section>
        <Section title="How is it attached?">
          <View style={{ gap: 8 }}><ChoiceRow title="Attached" sub="Fixed to the house" on={p.attach === "attached"} onPress={() => setP({ ...p, attach: "attached" })} /><ChoiceRow title="Detached" sub="Freestanding" on={p.attach === "detached"} onPress={() => setP({ ...p, attach: "detached" })} /></View>
        </Section>
        <Section title="Side enclosures & subsystems">
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingHorizontal: 16, gap: 12 }}><View style={{ flex: 1 }}><RNText style={S(14.5, "600")}>Add side enclosures or subsystems</RNText><RNText style={S(12, "400", c.text4)}>Optional · {p.enc.length ? `${p.enc.length} added` : "none"}</RNText></View><Toggle on={p.encOn} onChange={(v) => setP({ ...p, encOn: v })} /></View>
            {p.encOn && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
                {p.enc.map((e, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.surface2 }}><View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}><RNText style={S(13, "600", c.text2)}>{i + 1}</RNText></View><View style={{ flex: 1, gap: 2 }}><RNText style={S(14, "600")}>{e.type}</RNText><RNText style={S(12, "400", c.text4)}>{e.w} × {e.l} × {e.h} {unit}{e.loc ? ` · ${e.loc}` : ""}</RNText></View><Pressable onPress={() => setEd({ ...e, i })} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}><Ionicons name="pencil-outline" size={16} color={c.text2} /></Pressable><Pressable onPress={() => setP({ ...p, enc: p.enc.filter((_, k) => k !== i) })} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}><Ionicons name="trash-outline" size={16} color={c.err} /></Pressable></View>
                ))}
                {ed ? (
                  <View style={{ borderRadius: 14, borderWidth: 1, borderColor: c.orangeBd, backgroundColor: c.surface, padding: 12, gap: 10 }}>
                    <View><RNText style={S(13, "700")}>{ed.i >= 0 ? "Edit enclosure" : "New enclosure / subsystem"}</RNText><RNText style={S(12, "400", c.text4)}>Dimensions in {unit}</RNText></View>
                    <SelectField label="Type" value={ed.type} placeholder="Select type" onPress={() => setPick("encType")} />
                    <View style={{ flexDirection: "row", gap: 8 }}><Dim label="Width" k="w" small /><Dim label="Length" k="l" small /><Dim label="Height" k="h" small /></View>
                    <View style={{ gap: 4 }}><RNText style={S(12, "600", c.text2)}>Location <RNText style={S(12, "500", c.text4)}>(optional)</RNText></RNText><View style={{ flexDirection: "row", gap: 6 }}>{["Front", "Back", "Left", "Right"].map((l) => <Pressable key={l} onPress={() => setEd({ ...ed, loc: ed.loc === l ? undefined : l })} style={{ flex: 1, height: 36, borderRadius: 9, borderWidth: 1, borderColor: ed.loc === l ? c.primary : c.border2, backgroundColor: ed.loc === l ? c.primarySoft : c.surface, alignItems: "center", justifyContent: "center" }}><RNText style={S(13, "600")}>{l}</RNText></Pressable>)}</View></View>
                    <View style={{ flexDirection: "row", gap: 8 }}><SecondaryButton title="Cancel" height={40} style={{ flex: 1 }} onPress={() => setEd(null)} /><Pressable disabled={!ed.type || !ed.w || !ed.h} onPress={() => { const e = { type: ed.type, w: ed.w, l: ed.l, h: ed.h, loc: ed.loc }; setP({ ...p, enc: ed.i >= 0 ? p.enc.map((x, k) => (k === ed.i ? e : x)) : [...p.enc, e] }); setEd(null); }} style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: !ed.type || !ed.w || !ed.h ? c.surface3 : c.primary, alignItems: "center", justifyContent: "center" }}><RNText style={S(14, "600", !ed.type || !ed.w || !ed.h ? c.text4 : "#fff")}>{ed.i >= 0 ? "Save changes" : "Add"}</RNText></Pressable></View>
                  </View>
                ) : (
                  <Pressable onPress={() => setEd({ type: "", w: "", l: "0.3", h: p.h, i: -1 })} style={{ height: 44, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: c.orangeBd, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Ionicons name="add" size={18} color={c.orange} /><RNText style={S(14, "600", c.orange)}>{p.enc.length ? "Add another enclosure / subsystem" : "Add an enclosure / subsystem"}</RNText></Pressable>
                )}
              </View>
            )}
          </View>
        </Section>
        <Section title="Footings">
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, overflow: "hidden" }}>
            <View style={{ padding: 14, paddingHorizontal: 16, gap: 10 }}><RNText style={S(14.5, "600")}>Does this installation involve footings?</RNText><View style={{ flexDirection: "row", gap: 8 }}>{[true, false].map((v) => <Pressable key={String(v)} onPress={() => setP({ ...p, footOn: v })} style={{ flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: p.footOn === v ? c.primary : c.border2, backgroundColor: p.footOn === v ? c.primarySoft : c.surface, alignItems: "center", justifyContent: "center" }}><RNText style={S(14, "600")}>{v ? "Yes" : "No"}</RNText></Pressable>)}</View></View>
            {p.footOn && <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 10 }}><Field label="Number of footings" value={p.footN} onChangeText={(v) => setP({ ...p, footN: v })} keyboardType="numeric" placeholder="4" /><View style={{ flexDirection: "row", gap: 8 }}>{[true, false].map((v) => <Pressable key={String(v)} onPress={() => setP({ ...p, footReady: v })} style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: p.footReady === v ? c.primary : c.border2, backgroundColor: p.footReady === v ? c.primarySoft : c.surface, alignItems: "center", justifyContent: "center" }}><RNText style={S(13, "600")}>{v ? "Already in place" : "Not ready yet"}</RNText></Pressable>)}</View></View>}
            <View style={{ margin: 12, marginTop: 0 }}><Note tone="warn"><RNText style={S(12.5, "600", c.warn)}>Structural footing work is not included.</RNText> All required structural footings must be completed and ready before pergola installation.</Note></View>
          </View>
        </Section>
        <Section title="Accessories" right={<RNText style={S(12.5, "400", c.text4)}>{Object.values(p.acc).filter((n) => n > 0).length ? `${Object.values(p.acc).reduce((a, b) => a + b, 0)} selected` : "none"}</RNText>}>
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            {ACCESSORIES.map((a, i) => { const n = p.acc[a] ?? 0; return (
              <View key={a} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                <Pressable onPress={() => setP({ ...p, acc: { ...p.acc, [a]: n ? 0 : 1 } })} style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: n ? c.primary : c.surface3, alignItems: "center", justifyContent: "center" }}>{n > 0 && <Ionicons name="checkmark" size={16} color="#fff" />}</Pressable>
                <RNText style={{ flex: 1, ...S(14.5, n ? "600" : "400") }}>{a}</RNText>
                {n > 0 && <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Pressable onPress={() => setP({ ...p, acc: { ...p.acc, [a]: Math.max(0, n - 1) } })} style={{ width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: c.border2, alignItems: "center", justifyContent: "center" }}><Ionicons name="remove" size={16} color={c.text} /></Pressable><RNText style={{ width: 24, textAlign: "center", ...S(14, "600") }}>{n}</RNText><Pressable onPress={() => setP({ ...p, acc: { ...p.acc, [a]: n + 1 } })} style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}><Ionicons name="add" size={16} color="#fff" /></Pressable></View>}
              </View>); })}
            <View style={{ margin: 12 }}><Note tone="info"><RNText style={S(12.5, "600", c.info)}>Accessory installation includes mounting to the pergola structure only.</RNText> Electrical wiring, power connections, gas connections, plumbing, and water-supply work are not included.</Note></View>
          </View>
        </Section>
        <Section title="Photos">
          {p.photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{p.photos.map((u, i) => <View key={i}><Image source={{ uri: u }} style={{ width: 140, height: 140, borderRadius: 16, backgroundColor: c.surface2 }} /><Pressable onPress={() => setP({ ...p, photos: p.photos.filter((_, k) => k !== i) })} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(0,0,0,.45)", alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={16} color="#fff" /></Pressable></View>)}</ScrollView>
            : <View style={{ height: 140, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: c.border2, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", gap: 6 }}><Ionicons name="image-outline" size={26} color={c.text4} /><RNText style={S(13, "400", c.text4)}>Add a photo of your pergola</RNText></View>}
          <SecondaryButton title={busy ? "Uploading…" : "Upload photos"} icon={<Ionicons name="cloud-upload-outline" size={18} color={c.text} />} onPress={addPhoto} />
        </Section>
        <PrimaryButton title={params?.key ? "Save pergola" : "Add pergola"} onPress={save} disabled={!valid} />
      </ScrollView>
      <PickerSheet open={pick === "type"} onClose={() => setPick(null)} title="Pergola type" options={PERGOLA_TYPES} value={p.type} onSelect={(v) => setP({ ...p, type: v })} />
      <PickerSheet open={pick === "brand"} onClose={() => setPick(null)} title="Brand" options={BRANDS} value={p.brand} onSelect={(v) => setP({ ...p, brand: v })} searchable />
      <PickerSheet open={pick === "encType"} onClose={() => setPick(null)} title="Enclosure / subsystem type" options={ENCLOSURE_TYPES} value={ed?.type ?? ""} onSelect={(v) => ed && setEd({ ...ed, type: v })} />
    </SafeAreaView>
  );
}
