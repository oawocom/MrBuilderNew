import { getContent } from "@/lib/content";
import SitePage from "@/components/site/SitePage";
import PartnerBody from "@/components/site/PartnerBody";

export const metadata = { title: "Partner With Us — MrBuilder" };

export default async function Page() {
  const content = await getContent();
  return <SitePage appLinks={content.app_links}><PartnerBody /></SitePage>;
}
