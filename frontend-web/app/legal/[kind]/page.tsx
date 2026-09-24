import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Container, Section } from "@/components/site/ui";
import { getLegal } from "@/lib/content";

export default async function LegalPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "terms" && kind !== "privacy") notFound();
  const doc = await getLegal(kind);
  return (
    <>
      <SiteHeader />
      <Section><Container className="max-w-3xl"><h1 className="text-[36px] font-bold text-[#181D27]">{kind === "terms" ? "Terms of Service" : "Privacy Policy"}</h1>{doc ? <><p className="mt-2 text-sm text-gray-500">Last updated {doc.updated}</p><div className="mt-8 space-y-8">{doc.sections.map(([h, p]) => <section key={h}><h2 className="text-[20px] font-bold text-[#181D27]">{h}</h2><p className="mt-2 text-[16px] leading-7 text-gray-600">{p}</p></section>)}</div></> : <p className="mt-6 text-gray-600">This page is being prepared.</p>}</Container></Section>
      <SiteFooter />
    </>
  );
}
