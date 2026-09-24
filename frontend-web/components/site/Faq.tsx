"use client";

import { useState } from "react";

export function Faq({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState(0);
  return <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">{items.map(([q, a], i) => <div key={q}><button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"><span className="text-[16px] font-semibold text-[#181D27]">{q}</span><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gray-300 text-gray-500 transition ${open === i ? "rotate-45" : ""}`}>+</span></button>{open === i && <p className="px-5 pb-5 text-[15px] leading-6 text-gray-600">{a}</p>}</div>)}</div>;
}
