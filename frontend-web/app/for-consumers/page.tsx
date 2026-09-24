import { getContent } from "@/lib/content";
import SitePage from "@/components/site/SitePage";
import ForConsumersBody from "@/components/site/ForConsumersBody";

export const metadata = { title: "For Homeowners — MrBuilder" };

export default async function Page() {
  const content = await getContent();
  return <SitePage appLinks={content.app_links}><ForConsumersBody /></SitePage>;
}
