import type { Metadata } from "next";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mrbuilder.com";
export function siteMeta(title: string, description: string, path = "/"): Metadata {
  const url = SITE_URL + (path === "//" ? "/" : path);
  return {
    title, description,
    alternates: { canonical: url },
    icons: { icon: [{ url: "/favicon.ico" }, { url: "/site/brand/favicon-32.png", sizes: "32x32", type: "image/png" }], apple: "/site/brand/apple-touch-icon.png" },
    openGraph: { type: "website", siteName: "MrBuilder", title, description, url, images: [{ url: SITE_URL + "/site/brand/og.jpg", width: 1200, height: 630, alt: "MrBuilder" }] },
    twitter: { card: "summary_large_image", title, description, images: [SITE_URL + "/site/brand/og.jpg"] },
  };
}
