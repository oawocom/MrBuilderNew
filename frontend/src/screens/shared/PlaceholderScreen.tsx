import React from "react";
import { useRoute } from "@react-navigation/native";
import { Empty, Screen, Text } from "../../components";

export default function PlaceholderScreen() {
  const { params } = useRoute<{ key: string; name: string; params: { title?: string } }>();
  return <Screen><Text v="h1" style={{ marginBottom: 16 }}>{params?.title ?? "Soon"}</Text><Empty title="Coming in the next build" text="This section is being connected to your account." /></Screen>;
}
