import React from "react";
import { StatusBar } from "expo-status-bar";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { SessionProvider } from "./src/auth/session";
import RootNavigator from "./src/navigation";
import { RequestDraftProvider } from "./src/state/requestDraft";
import { ContentProvider } from "./src/state/content";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { navigationRef } from "./src/navigation";
import { payloadOf } from "./src/push/push";
import { APP_VARIANT } from "./src/api/client";

export default function App() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  useEffect(() => {
    const open = (resp: Notifications.NotificationResponse | null) => { const d = payloadOf(resp); if (!d || !navigationRef.isReady()) return; if (d.conversation_id) navigationRef.navigate("Chat", { id: d.conversation_id, title: "Chat" }); else if (d.job_id) navigationRef.navigate(APP_VARIANT === "contractor" ? "JobDetail" : "RequestDetail", { id: d.job_id }); else if (d.screen === "mrcare") navigationRef.navigate("Tabs", { screen: "MrCare" }); };
    Notifications.getLastNotificationResponseAsync().then((r) => setTimeout(() => open(r), 800));
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <ContentProvider>
          <RequestDraftProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </RequestDraftProvider>
          </ContentProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
