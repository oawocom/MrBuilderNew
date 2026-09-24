import { getContent } from "@/lib/content";
import { siteMeta } from "@/lib/seo";
import SitePage from "@/components/site/SitePage";
import HomeBody from "@/components/site/HomeBody";

export const metadata = siteMeta("MrBuilder — Pergola installation, care & repair", "MrBuilder connects pergola installation, repair and service needs with the professionals who carry out the work. One place to request, follow and pay for a job.", "/");

export default async function Page() {
  const content = await getContent();
  return <SitePage appLinks={content.app_links}><HomeBody /></SitePage>;
}
