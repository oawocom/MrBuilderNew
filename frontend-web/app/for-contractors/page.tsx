import { getContent } from "@/lib/content";
import SitePage from "@/components/site/SitePage";
import ForContractorsBody from "@/components/site/ForContractorsBody";

export const metadata = { title: "For Contractors — MrBuilder" };

export default async function Page() {
  const content = await getContent();
  return <SitePage appLinks={content.app_links}><ForContractorsBody /></SitePage>;
}
