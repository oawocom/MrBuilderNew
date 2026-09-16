import React, { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { Button, Card, KV, Row, Screen, Text } from "../../components";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { api, APP_VARIANT } from "../../api/client";

interface Settings { notifications: { push: boolean; email: boolean; sms: boolean; n_jobs: boolean; n_msgs: boolean; n_updates: boolean } }

export default function SettingsScreen() {
  const { user, logout } = useSession();
  const { c, space } = useTheme();
  const [s, setS] = useState<Settings | null>(null);
  const load = () => api<Settings>("/me/settings").then((r) => setS(r.data ?? null));
  useEffect(() => { load(); }, []);
  async function toggle(k: string, v: boolean) { await api("/me/notifications", { method: "PATCH", body: { [k]: v } }); load(); }
  return (
    <Screen>
      <Text v="h1" style={{ marginBottom: space.lg }}>Account</Text>
      <Card style={{ marginBottom: space.md }}>
        <Row gap={12}><View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Text v="h3" color={c.primaryText}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Text></View>
          <View><Text v="h3">{user?.first_name} {user?.last_name}</Text><Text v="small" color={c.text4}>{user?.email}</Text></View></Row>
        <KV k="Phone" v={user?.phone ?? "—"} /><KV k="Account" v={APP_VARIANT === "contractor" ? "MrBuilder PRO" : "Customer"} /><KV k="Status" v={user?.status ?? ""} />
      </Card>
      {s && (
        <Card style={{ marginBottom: space.md }}>
          <Text v="h3" style={{ marginBottom: space.sm }}>Notifications</Text>
          {([["push", "Push notifications"], ["email", "Email"], ["sms", "SMS"], ["n_jobs", "Job updates"], ["n_msgs", "Messages"], ["n_updates", "News & offers"]] as const).map(([k, l]) => (
            <Row key={k} between style={{ paddingVertical: 6 }}><Text v="body">{l}</Text><Switch value={s.notifications[k]} onValueChange={(v) => toggle(k, v)} trackColor={{ true: c.primary }} /></Row>
          ))}
        </Card>
      )}
      <Button title="Sign out" kind="secondary" onPress={logout} />
    </Screen>
  );
}
