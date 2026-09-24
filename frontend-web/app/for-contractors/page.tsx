import { getContent } from "@/lib/content";
import { siteMeta } from "@/lib/seo";
import SitePage from "@/components/site/SitePage";
import ForContractorsBody from "@/components/site/ForContractorsBody";

export const metadata = siteMeta("For Contractors — MrBuilder", "Priced, scheduled pergola jobs that match your skills. Accept what fits, run the job with checklists and proof photos, get paid when the customer confirms.", "/for-contractors");

export default async function Page() {
  const content = await getContent();
  return <SitePage appLinks={content.app_links}><ForContractorsBody /></SitePage>;
}
