import { getContent } from "@/lib/content";
import { siteMeta } from "@/lib/seo";
import SitePage from "@/components/site/SitePage";
import PartnerBody from "@/components/site/PartnerBody";

export const metadata = siteMeta("Partner With Us — MrBuilder", "Pergola manufacturers, sellers and suppliers: let MrBuilder be the installation and after-sales layer behind your products.", "/partner");

export default async function Page() {
  const content = await getContent();
  return <SitePage appLinks={content.app_links}><PartnerBody /></SitePage>;
}
