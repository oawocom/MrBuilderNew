import Link from "next/link";
import { getContent } from "@/lib/content";
import { AppBadges } from "./AppBadges";

export default async function SiteFooter() {
  const content = await getContent();
  const co = content.company; const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-200 bg-[#FAFAFA]">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-[1.3fr_2fr]">
        <div><div className="flex items-center gap-2"><img src="/site/brand/mrb-head-logo.png" alt="" className="h-10 w-auto" /><img src="/site/brand/mrb-wordmark.png" alt="Mr. Builder" className="h-6 w-auto" /></div><p className="mt-4 max-w-sm text-[15px] leading-6 text-gray-600">{co.tagline}</p></div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1"><div className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Get the app</div><AppBadges links={content.app_links} column /></div>
          <div><div className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Platform</div>{[["/for-consumers", "For Consumers"], ["/for-contractors", "For Contractors"], ["/partner#companies", "For Companies"], ["/partner", "Partner With Us"]].map(([h, l]) => <Link key={l} href={h} className="block py-1 text-[15px] text-gray-700 hover:text-gray-900">{l}</Link>)}</div>
          <div><div className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Company</div><Link href="/about" className="block py-1 text-[15px] text-gray-700">About MrBuilder</Link><a href={`mailto:${co.email}`} className="block py-1 text-[15px] text-gray-700">Contact</a><Link href="/legal/terms" className="block py-1 text-[15px] text-gray-700">Terms</Link><Link href="/legal/privacy" className="block py-1 text-[15px] text-gray-700">Privacy</Link></div>
          <div><div className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Get started</div><Link href="/register" className="block py-1 text-[15px] text-gray-700">Get Started</Link><Link href="/register?role=contractor" className="block py-1 text-[15px] text-gray-700">Join as a Contractor</Link><Link href="/partner#inquiry" className="block py-1 text-[15px] text-gray-700">Become a Company Partner</Link></div>
        </div>
      </div>
      <div className="border-t border-gray-200"><div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2 px-5 py-4 text-[13px] text-gray-500"><span>© {year} {co.legal_name}. All rights reserved.{co.address ? ` · ${co.address}` : ""}</span><span>Starting in the United States · expanding internationally over time.</span></div></div>
    </footer>
  );
}
