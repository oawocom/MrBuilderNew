import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

const BULLETS = "A quote before anything is booked|Vetted professionals matched to your job|Photos, messages and receipts in one thread|You confirm the finished work before paying".split("|").filter(Boolean);
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (<><SiteHeader /><div data-hdr-spacer style={{ height: 96 }} />
    <div className="bg-[#FAFAFA]"><div className="mx-auto grid max-w-[1200px] items-start gap-10 px-5 py-12 lg:grid-cols-[1fr_480px] lg:gap-16 lg:py-20">
      <div className="lg:sticky lg:top-28"><div className="mb-3 text-[13px] font-bold uppercase tracking-[.08em] text-[#EF6820]">Create your account</div><h1 className="text-[36px] font-bold leading-tight tracking-tight text-[#181D27] md:text-[44px]">One account for every pergola job.</h1><p className="mt-4 max-w-lg text-[17px] leading-7 text-gray-600">Sign up once to request installation or repairs, approve quotes, follow the visit and pay when you confirm the work. Contractors: register here, then finish onboarding in the MrBuilder PRO app.</p>{BULLETS.length > 0 && <ul className="mt-6 space-y-3">{BULLETS.map((b) => <li key={b} className="flex gap-3 text-[15px] text-gray-700"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#ECFDF3] text-[12px] font-bold text-[#067647]">✓</span>{b}</li>)}</ul>}<p className="mt-8 text-[13px] text-gray-500">Starting in the United States.</p></div>
      <div>{children}</div>
    </div></div>
  <SiteFooter /></>);
}
