import { getContent } from "@/lib/content";
import SitePage from "@/components/site/SitePage";
import HomeBody from "@/components/site/HomeBody";

export const metadata = { title: "MrBuilder — Outdoor living, installed and looked after." };

export default async function Page() {
  const content = await getContent();
  return <SitePage appLinks={content.app_links}><HomeBody /></SitePage>;
}
