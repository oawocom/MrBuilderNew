import Link from "next/link";

export const Container = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`mx-auto max-w-[1200px] px-5 ${className}`}>{children}</div>;
export const Eyebrow = ({ children, color = "text-[#EF6820]" }: { children: React.ReactNode; color?: string }) => <div className={`mb-3 text-[13px] font-bold uppercase tracking-[.08em] ${color}`}>{children}</div>;
export const H2 = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <h2 className={`text-[32px] font-bold leading-tight tracking-tight text-[#181D27] md:text-[40px] ${className}`}>{children}</h2>;
export const Lead = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <p className={`mt-4 max-w-2xl text-[17px] leading-7 text-gray-600 ${className}`}>{children}</p>;
export const Section = ({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) => <section id={id} className={`py-16 md:py-24 ${className}`}>{children}</section>;
export const Btn = ({ href, children, kind = "primary", className = "" }: { href: string; children: React.ReactNode; kind?: "primary" | "secondary" | "ghost" | "white"; className?: string }) => {
  const k = { primary: "bg-[#EF6820] text-white hover:bg-[#C4561A]", secondary: "border border-gray-300 bg-white text-[#181D27] hover:bg-gray-50", ghost: "text-[#B93815] hover:underline", white: "bg-white text-[#181D27] hover:bg-gray-100" }[kind];
  return <Link href={href} className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition ${k} ${className}`}>{children}</Link>;
};
export const Check = () => <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#ECFDF3] text-[12px] font-bold text-[#067647]">✓</span>;
export const Chip = ({ children, tone = "or" }: { children: React.ReactNode; tone?: "ok" | "wn" | "in" | "or" | "gray" }) => { const t = { ok: "bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]", wn: "bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]", in: "bg-[#EFF4FF] text-[#175CD3] border-[#B2CCFF]", or: "bg-[#FEF6EE] text-[#B93815] border-[#F9DBAF]", gray: "bg-gray-100 text-gray-600 border-gray-200" }[tone]; return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${t}`}>{children}</span>; };
export const S = (name: string) => `/site/screens/${name}.webp`;
export const T = (name: string) => `/site/screens/tall/${name}.webp`;
