import { getContent } from "@/lib/content";
import { siteMeta } from "@/lib/seo";
import SitePage from "@/components/site/SitePage";
import AboutBody from "@/components/site/AboutBody";

export const metadata = siteMeta("About — MrBuilder", "MrBuilder started in 2020 as an installation and service team and is now a platform connecting homeowners, contractors and pergola companies.", "/about");

export default async function Page() {
  const content = await getContent();
  return <SitePage appLinks={content.app_links}><AboutBody /></SitePage>;
}
