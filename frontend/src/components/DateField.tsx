// Calendar / time picker field: same look as Field, opens a native picker instead of a keyboard.
// value formats: date "YYYY-MM-DD", time "h:mm AM", datetime "YYYY-MM-DD HH:MM".
import React, { useState } from "react";
import { Platform, Pressable, Text as RNText, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Sheet } from "./sheet";
import { PrimaryButton } from "./form";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/tokens";

type Mode = "date" | "time" | "datetime";
const p2 = (n: number) => String(n).padStart(2, "0");
export function fmtValue(d: Date, mode: Mode) {
  const ymd = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  if (mode === "date") return ymd;
  if (mode === "time") return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${ymd} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
export function parseValue(v: string, mode: Mode): Date | null {
  if (!v) return null;
  if (mode === "time") { const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(v.trim()); if (!m) return null; let h = Number(m[1]); if (m[3]) { if (m[3].toUpperCase() === "PM" && h < 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; } const d = new Date(); d.setHours(h, Number(m[2]), 0, 0); return d; }
  const d = new Date(v.replace(" ", "T")); return isNaN(d.getTime()) ? null : d;
}
function pretty(v: string, mode: Mode) {
  const d = parseValue(v, mode); if (!d) return v;
  if (mode === "date") return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  if (mode === "time") return v;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function DateField({ label, value, onChange, mode = "date", placeholder, error, minimumDate, maximumDate, hint }: { label?: string; value: string; onChange: (v: string) => void; mode?: Mode; placeholder?: string; error?: string | null; minimumDate?: Date; maximumDate?: Date; hint?: string }) {
  const { c, dark } = useTheme();
  const [step, setStep] = useState<null | "ios" | "date" | "time">(null);
  const [tmp, setTmp] = useState<Date>(() => parseValue(value, mode) ?? new Date());
  const ph = placeholder ?? (mode === "date" ? "Pick a date" : mode === "time" ? "Pick a time" : "Pick date & time");
  const clamp = (d: Date) => (minimumDate && d < minimumDate ? minimumDate : maximumDate && d > maximumDate ? maximumDate : d);
  const start = () => {
    setTmp(clamp(parseValue(value, mode) ?? new Date()));
    setStep(Platform.OS === "ios" ? "ios" : mode === "time" ? "time" : "date");
  };
  const done = (d: Date) => { onChange(fmtValue(clamp(d), mode)); setStep(null); };
  return (
    <View style={{ gap: 6 }}>
      {label && <RNText style={{ fontFamily: font.semibold, fontSize: 13, color: c.text2 }}>{label}</RNText>}
      <Pressable onPress={start} style={{ height: 52, borderRadius: 12, borderWidth: 1, borderColor: error ? c.err : step ? c.primary : c.border2, backgroundColor: c.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={mode === "time" ? "time-outline" : "calendar-outline"} size={18} color={value ? c.primary : c.text4} />
        <RNText numberOfLines={1} style={{ flex: 1, fontSize: 15, fontFamily: font.regular, color: value ? c.text : c.text4 }}>{value ? pretty(value, mode) : ph}</RNText>
        {!!value && <Pressable hitSlop={8} onPress={() => onChange("")}><Ionicons name="close-circle" size={18} color={c.text4} /></Pressable>}
      </Pressable>
      {error ? <RNText style={{ fontSize: 12.5, fontFamily: font.regular, color: c.err }}>⚠ {error}</RNText> : hint ? <RNText style={{ fontSize: 12, fontFamily: font.regular, color: c.text4 }}>{hint}</RNText> : null}
      {Platform.OS === "ios" && (
        <Sheet open={step === "ios"} onClose={() => setStep(null)} title={label ?? ph}>
          <View style={{ alignItems: "center" }}>
            <DateTimePicker value={tmp} mode={mode} display={mode === "time" ? "spinner" : "inline"} minimumDate={minimumDate} maximumDate={maximumDate} minuteInterval={mode === "date" ? undefined : 5} onChange={(_e, d) => d && setTmp(d)} accentColor={c.primary} themeVariant={dark ? "dark" : "light"} />
          </View>
          <PrimaryButton title="Done" onPress={() => done(tmp)} />
        </Sheet>
      )}
      {Platform.OS === "android" && step === "date" && (
        <DateTimePicker value={tmp} mode="date" display="default" minimumDate={minimumDate} maximumDate={maximumDate}
          onChange={(e, d) => { if (e.type !== "set" || !d) { setStep(null); return; } if (mode === "datetime") { setTmp(d); setStep("time"); } else done(d); }} />
      )}
      {Platform.OS === "android" && step === "time" && (
        <DateTimePicker value={tmp} mode="time" display="default" minuteInterval={5}
          onChange={(e, d) => { if (e.type !== "set" || !d) { setStep(null); return; } const x = new Date(tmp); x.setHours(d.getHours(), d.getMinutes(), 0, 0); done(x); }} />
      )}
    </View>
  );
}
