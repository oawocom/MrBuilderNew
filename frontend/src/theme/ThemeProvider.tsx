import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { dark, light, Palette, radius, space, type } from "./tokens";

type Mode = "system" | "light" | "dark";
const Ctx = createContext<{ c: Palette; dark: boolean; mode: Mode; setMode: (m: Mode) => void; radius: typeof radius; space: typeof space; type: typeof type }>({ c: light, dark: false, mode: "system", setMode: () => {}, radius, space, type });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [mode, setModeState] = useState<Mode>("system");
  useEffect(() => { SecureStore.getItemAsync("mrb_theme").then((v) => { if (v === "light" || v === "dark") setModeState(v); }); }, []);
  const setMode = (m: Mode) => { setModeState(m); SecureStore.setItemAsync("mrb_theme", m); };
  const isDark = mode === "system" ? scheme === "dark" : mode === "dark";
  const value = useMemo(() => ({ c: isDark ? dark : light, dark: isDark, mode, setMode, radius, space, type }), [isDark, mode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);
