import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["/", "/for-consumers", "/for-contractors", "/partner", "/about", "/legal/terms", "/legal/privacy"].map((p) => ({ url: SITE_URL + p, lastModified: now, changeFrequency: "monthly", priority: p === "/" ? 1 : 0.7 }));
}
