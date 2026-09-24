"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [["/", "Home"], ["/for-consumers", "For Consumers"], ["/for-contractors", "For Contractors"], ["/partner", "Partner With Us"], ["/about", "About MrBuilder"]];

export default function SiteHeader({ dark = false }: { dark?: boolean }) {
  const path = usePathname(); const [open, setOpen] = useState(false); const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener("scroll", f); return () => window.removeEventListener("scroll", f); }, []);
  useEffect(() => { setOpen(false); }, [path]);
  const onDark = dark && !scrolled && !open;
  return (
    <header className={`sticky top-0 z-40 transition-colors ${onDark ? "bg-transparent" : "border-b border-gray-200 bg-white/95 backdrop-blur"}`}>
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2"><img src={onDark ? "/site/brand/mrb-head-logo-white.png" : "/site/brand/mrb-head-logo.png"} alt="" className="h-10 w-auto" /><img src="/site/brand/mrb-wordmark.png" alt="Mr. Builder" className={`h-6 w-auto ${onDark ? "brightness-0 invert" : ""}`} /></Link>
        <nav className="hidden items-center gap-1 lg:flex">{LINKS.map(([href, label]) => <Link key={href} href={href} className={`rounded-full px-3.5 py-2 text-[15px] font-medium transition ${path === href ? (onDark ? "bg-white/15 text-white" : "bg-gray-100 text-gray-900") : onDark ? "text-white/80 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}>{label}</Link>)}</nav>
        <div className="hidden items-center gap-2 lg:flex"><Link href="/login" className={`rounded-full px-4 py-2 text-[15px] font-semibold ${onDark ? "text-white" : "text-gray-700"}`}>Log in</Link><Link href="/register" className="rounded-full bg-[#EF6820] px-4 py-2 text-[15px] font-semibold text-white hover:bg-[#C4561A]">Get Started</Link></div>
        <button onClick={() => setOpen(!open)} aria-label="Menu" className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"><span className={`h-0.5 w-6 transition ${onDark ? "bg-white" : "bg-gray-900"} ${open ? "translate-y-2 rotate-45" : ""}`} /><span className={`h-0.5 w-6 transition ${onDark ? "bg-white" : "bg-gray-900"} ${open ? "-translate-y-0 -rotate-45" : ""}`} /></button>
      </div>
      {open && <div className="border-t border-gray-200 bg-white px-5 py-3 lg:hidden">{LINKS.map(([href, label], i) => <Link key={href} href={href} className="flex items-center justify-between border-b border-gray-100 py-3 text-[17px] font-medium text-gray-900"><span>{label}</span><span className="text-xs text-gray-400">0{i + 1}</span></Link>)}<div className="flex gap-2 pt-4"><Link href="/login" className="flex-1 rounded-full border border-gray-300 py-2.5 text-center font-semibold">Log in</Link><Link href="/register" className="flex-1 rounded-full bg-[#EF6820] py-2.5 text-center font-semibold text-white">Get Started</Link></div></div>}
    </header>
  );
}
