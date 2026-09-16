import React from "react";
import { StatusBar } from "expo-status-bar";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { SessionProvider } from "./src/auth/session";
import RootNavigator from "./src/navigation";
import { RequestDraftProvider } from "./src/state/requestDraft";

export default function App() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <RequestDraftProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </RequestDraftProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
