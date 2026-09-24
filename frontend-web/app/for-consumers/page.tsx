import { getContent } from "@/lib/content";
import { siteMeta } from "@/lib/seo";
import SitePage from "@/components/site/SitePage";
import ForConsumersBody from "@/components/site/ForConsumersBody";

export const metadata = siteMeta("For Homeowners — MrBuilder", "Tell MrBuilder what you need. We price it, match a vetted pergola professional, and keep you updated in one thread until you confirm the finished work.", "/for-consumers");

export default async function Page() {
  const content = await getContent();
  return <SitePage appLinks={content.app_links}><ForConsumersBody /></SitePage>;
}
