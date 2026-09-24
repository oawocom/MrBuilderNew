"use client";
import React from "react";
import { Site } from "./dc";
import { setAppLinks } from "./submissions";

export default function SitePage({ appLinks, children }: { appLinks?: Record<string, string>; children: React.ReactNode }) {
  setAppLinks(appLinks);
  return <Site>{children}</Site>;
}
