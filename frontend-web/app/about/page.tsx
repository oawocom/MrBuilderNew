import { getContent } from "@/lib/content";
import SitePage from "@/components/site/SitePage";
import AboutBody from "@/components/site/AboutBody";

export const metadata = { title: "About — MrBuilder" };

export default async function Page() {
  const content = await getContent();
  return <SitePage appLinks={content.app_links}><AboutBody /></SitePage>;
}
