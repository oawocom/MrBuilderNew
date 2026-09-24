import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Phone } from "@/components/site/Phone";
import { JobHandoff } from "@/components/site/JobHandoff";
import { Btn, Check, Chip, Container, Eyebrow, H2, Lead, S, Section } from "@/components/site/ui";

export const metadata = { title: "MrBuilder — Pergola installation, care & repair", description: "MrBuilder connects pergola installation, repair and service needs with the professionals who carry out the work." };

const STEPS: { n: string; status: string; tone: "or" | "wn" | "in" | "ok"; title: string; body: string }[] = [
  { n: "1", status: "Submitted", tone: "or", title: "Describe the work", body: "A homeowner or company submits an installation or repair request: address, pergola type, dimensions, photos, preferred dates." },
  { n: "2", status: "Quote ready", tone: "wn", title: "Get a quote", body: "MrBuilder prices the request from the details provided or from an inspector's report. The quote is itemized and can be approved or declined." },
  { n: "3", status: "Contractor assigned", tone: "in", title: "A pro accepts the job", body: "Approved jobs appear in the contractor marketplace with scope, dates and payment shown. A vetted contractor accepts and both sides are notified." },
  { n: "4", status: "Completed · paid", tone: "ok", title: "Track, confirm, pay", body: "Progress, proof photos and messages live in one thread. The customer confirms the finished work and payment is released to the contractor." },
];
const FEATURES = [
  { tag: "Quotes", title: "Itemized quotes both sides can read.", body: "An inspector records findings and photos on site; MrBuilder turns the report into a priced quote. The customer sees exactly what the contractor submitted, line by line.", a: ["Consumer app", "Request details: inspector report and quote with Approve / Decline.", S("c-inspector-quote")], b: ["Contractor app", "Inspection report & quote sheet: findings, photos, itemized lines, payout preview.", S("k-inspection-report")], link: ["/for-consumers#journey", "How consumers approve quotes"] },
  { tag: "Progress", title: "One timeline, updated by whoever does the work.", body: "When the contractor taps \"Start job\" the customer sees \"In progress\". Pre-job checklists, on-the-way status and proof photos flow into the same timeline.", a: ["Contractor app", "Job: Started: checklist complete, progress steps, Mark completed.", S("k-job-started")], b: ["Consumer app", "Request details: In progress with the contractor's live steps.", S("c-in-progress")], link: ["/for-contractors#journey", "How contractors manage jobs"] },
  { tag: "Communication", title: "Chat and calls attached to the job.", body: "Every job has its own conversation. Quotes and reports arrive as rich cards in the thread, and the contact card is one tap from the header.", a: ["Consumer app", "Chat with the assigned technician, quote card with Review.", S("c-chat")], b: ["Contractor app", "Messages and job chat with the client.", S("k-chat")], link: ["/for-consumers#journey", "See the consumer journey"] },
  { tag: "MrCare", title: "Care that continues after the install.", body: "MrCare offers two separate protections in the consumer app: a Service & Maintenance Subscription for scheduled visits, and an Electronics Protection Plan for motors, sensors, remotes and controllers.", a: ["Consumer app", "MrCare hub: both offerings with Book Maintenance and Report an Electronics Issue.", S("c-mrcare")], b: ["Consumer app", "Maintenance plans: Essential · Plus · Premium.", S("c-plans")], link: ["/for-consumers#mrcare", "About MrCare"] },
];

export default function HomePage() {
  return (
    <>
      <div className="bg-[#181D27] text-white"><SiteHeader dark />
        <Container className="grid items-center gap-12 pb-20 pt-10 lg:grid-cols-[1.15fr_1fr] lg:pb-28 lg:pt-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-white/90 ring-1 ring-white/15"><span className="h-2 w-2 rounded-full bg-[#EF6820]" />Pergola installation, care & repair</div>
            <h1 className="text-[40px] font-bold leading-[1.05] tracking-tight md:text-[60px]">Outdoor living, installed and looked after.</h1>
            <p className="mt-6 max-w-xl text-[17px] leading-7 text-[#D5D7DA]">MrBuilder connects pergola installation, repair and service needs with the professionals who carry out the work, so homeowners get one place to request and follow a job, contractors find work that fits their skills, and pergola companies can focus on selling.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3"><Btn href="/register">Get Started</Btn><Btn href="/register?role=contractor" kind="white">Join as a Contractor</Btn><Link href="/partner#companies" className="font-semibold text-white/85 hover:text-white">For pergola companies <span aria-hidden>→</span></Link></div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/60"><span>📱 Consumer app</span><span>🛠 Contractor app</span><span>· Company portal (in planning)</span></div>
          </div>
          <div className="flex justify-center gap-4"><Phone src={S("c-home")} alt="MrBuilder consumer app: Home screen with Install a pergola and Repair or maintain cards" label="Consumer app" className="w-1/2" /><Phone src={S("k-marketplace")} alt="MrBuilder contractor app: Marketplace with new jobs to accept" label="Contractor app" className="mt-10 w-1/2" /></div>
        </Container>
      </div>

      <Section><Container className="grid gap-10 lg:grid-cols-2"><div><Eyebrow>Why MrBuilder</Eyebrow><H2>A pergola is sold in a day. It gets installed, repaired and cared for over years.</H2></div><div className="space-y-4 text-[17px] leading-7 text-gray-600"><p>After the sale, the work scatters: someone has to quote it, find an installer, schedule it, show up, finish it, and answer the call when a motor stops responding two summers later. Today that falls on whoever picks up the phone.</p><p>MrBuilder puts the whole lifecycle in one place. A homeowner or a company describes what they need; MrBuilder prices it, matches a vetted contractor, and everyone follows the same job in their own app, from request to confirmed completion.</p></div></Container></Section>

      <Section className="bg-[#FAFAFA]"><Container><Eyebrow>How it works</Eyebrow><H2>One job. Both sides see the same status.</H2><Lead>Every request moves through a shared set of stages. The consumer's "Contractor assigned" is the contractor's "Accepted". Nobody has to ask where things stand.</Lead>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{STEPS.map((s) => <div key={s.n} className="rounded-[20px] border border-gray-200 bg-white p-6"><div className="flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#181D27] text-sm font-bold text-white">{s.n}</span><Chip tone={s.tone}>{s.status}</Chip></div><div className="mt-4 text-[18px] font-bold text-[#181D27]">{s.title}</div><p className="mt-2 text-[15px] leading-6 text-gray-600">{s.body}</p></div>)}</div></Container></Section>

      <Section><Container><Eyebrow>Who it's for</Eyebrow><H2>Three groups, one platform.</H2>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">{[
          { eyebrow: "For consumers", color: "text-[#EF6820]", h: "Request it. Approve a quote. Follow the job.", pts: ["Installation and repair requests with photos and dimensions", "Itemized quotes to approve or decline", "Chat, calls, progress and payment in one thread"], href: "/for-consumers", label: "For Consumers", img: S("c-requests"), alt: "Consumer app: Requests list with status chips" },
          { eyebrow: "For contractors", color: "text-[#EF6820]", h: "Jobs that match your skills, near you.", pts: ["Marketplace of installation, repair and inspection jobs", "Price, dates and scope shown before you accept", "Checklists, proof photos and payouts in the app"], href: "/for-contractors", label: "For Contractors", img: S("k-job-accepted"), alt: "Contractor app: accepted job with pre-job checklist" },
          { eyebrow: "For pergola companies", color: "text-[#175CD3]", h: "Focus on selling. We handle installation and after-sales service.", pts: ["Submit installation requests for products you've sold", "Request repairs and service for your customers", "Track every job in one partner account"], href: "/partner#companies", label: "For Companies", img: S("c-completed"), alt: "Consumer app: completed and paid request with receipt" },
        ].map((c) => <div key={c.href} className="flex flex-col overflow-hidden rounded-[24px] border border-gray-200 bg-white"><div className="p-7"><Eyebrow color={c.color}>{c.eyebrow}</Eyebrow><h3 className="text-[22px] font-bold leading-snug text-[#181D27]">{c.h}</h3><ul className="mt-4 space-y-2">{c.pts.map((p) => <li key={p} className="flex gap-2 text-[15px] text-gray-700"><Check />{p}</li>)}</ul><Link href={c.href} className="mt-5 inline-block font-semibold text-[#B93815]">{c.label} →</Link></div><div className="mt-auto bg-[#FAFAFA] px-10 pt-6"><img src={c.img} alt={c.alt} className="w-full rounded-t-[26px] border-[5px] border-b-0 border-[#181D27]" loading="lazy" /></div></div>)}</div></Container></Section>

      <Section className="bg-[#FAFAFA]"><Container><Eyebrow>See it in action</Eyebrow><H2>Both apps, one job.</H2><Lead>One request, followed live through both apps, from the homeowner's quote to the contractor's acceptance. Full walkthroughs live on the <Link href="/for-consumers" className="font-semibold text-[#B93815]">For Consumers</Link> and <Link href="/for-contractors" className="font-semibold text-[#B93815]">For Contractors</Link> pages.</Lead><div className="mt-10 rounded-[28px] bg-[#181D27] p-6 md:p-10"><JobHandoff /></div></Container></Section>

      <Section><Container><Eyebrow>Inside the apps</Eyebrow><H2>Real screens, real workflows.</H2>
        <div className="mt-10 space-y-16">{FEATURES.map((f, i) => <div key={f.tag} className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}><div><Eyebrow>{f.tag}</Eyebrow><h3 className="text-[28px] font-bold leading-tight text-[#181D27]">{f.title}</h3><p className="mt-3 text-[16px] leading-7 text-gray-600">{f.body}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{[f.a, f.b].map(([app, cap]) => <div key={cap} className="rounded-xl bg-[#FAFAFA] p-3"><div className="text-xs font-bold uppercase tracking-wide text-gray-500">{app}</div><div className="mt-1 text-[13px] text-gray-700">{cap}</div></div>)}</div><Link href={f.link[0]} className="mt-5 inline-block font-semibold text-[#B93815]">{f.link[1]} →</Link></div><div className="flex justify-center gap-4"><Phone src={f.a[2]} alt={f.a[1]} className="w-1/2" /><Phone src={f.b[2]} alt={f.b[1]} className="mt-8 w-1/2" /></div></div>)}</div></Container></Section>

      <Section className="bg-[#181D27] text-white"><Container className="grid gap-6 md:grid-cols-3">{[
        ["Homeowners", "Get Started", "Create your first installation or repair request in the MrBuilder app.", "/for-consumers", "Open For Consumers →", "/register"],
        ["Contractors", "Join as a Contractor", "Apply in the contractor app and start reviewing jobs near you.", "/for-contractors", "Open For Contractors →", "/register?role=contractor"],
        ["Pergola companies", "Become a Company Partner", "Hand installation and after-sales service to MrBuilder.", "/partner#companies", "Open For Companies →", "/partner#inquiry"],
      ].map(([who, h, body, href, label, cta]) => <div key={who} className="rounded-[24px] bg-white/5 p-7 ring-1 ring-white/10"><Eyebrow color="text-[#F7A26B]">{who}</Eyebrow><h3 className="text-[24px] font-bold">{h}</h3><p className="mt-2 text-[15px] text-[#D5D7DA]">{body}</p><div className="mt-5 flex flex-wrap items-center gap-4"><Btn href={cta} className="h-11">{h}</Btn><Link href={href} className="text-sm font-semibold text-white/80">{label}</Link></div></div>)}</Container></Section>
      <SiteFooter />
    </>
  );
}
