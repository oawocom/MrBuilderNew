import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ForPros from "@/components/landing/ForPros";

const steps = [
  ["Register", "Create your PRO account here or in the app. Tell us your service area and the categories you want to work in."],
  ["Get approved", "We verify your details. Approval unlocks the training hub."],
  ["Train & pass", "Core and Safety modules, then the category modules you chose. Short quizzes — 80% to pass, safety questions must be right."],
  ["Supervised first job", "For Installation and Repair, your first job is assessed. Pass it and the category is active."],
  ["Accept jobs", "See priced jobs near you, accept, and follow the guided flow: on my way → arrived → photos & checklist → start → complete."],
  ["Get paid", "Earnings land when the customer confirms. Withdraw when you want, or turn on automatic payouts."],
];

export default function ForContractorsPage() {
  return (
    <>
      <Header />
      <section className="mx-auto max-w-[1280px] px-4 pt-16 text-center lg:px-0">
        <p className="text-sm font-semibold text-brand-600">For contractors</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">Become a MrBuilder PRO</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">Pergola jobs, priced and scheduled, delivered to your phone. You bring the craft — we bring the customers, the pricing and the protection.</p>
        <div className="mt-8 flex justify-center gap-3"><Link href="/register?role=contractor" className="rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700">Apply now</Link><Link href="/login" className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700">Sign in</Link></div>
      </section>
      <section className="mx-auto max-w-[1280px] px-4 py-20 lg:px-0">
        <h2 className="mb-10 text-center text-3xl font-semibold">From application to first payout</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map(([t, d], i) => <li key={t} className="rounded-2xl border border-gray-200 bg-white p-6"><span className="text-sm font-bold text-brand-600">{String(i + 1).padStart(2, "0")}</span><h3 className="mt-2 font-semibold">{t}</h3><p className="mt-1 text-sm text-gray-600">{d}</p></li>)}
        </ol>
      </section>
      <ForPros />
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-0">
          <h2 className="text-2xl font-semibold">What we ask of every PRO</h2>
          <ul className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-2">
            <li>· Before-work photos (3 area + 1 product) and the safety checklist before every start</li>
            <li>· Mounting only for lighting, heaters and controls — electrical, gas and plumbing are out of scope</li>
            <li>· No side pricing: quotes come from MrBuilder; extra work goes through a new request</li>
            <li>· Pause for safety whenever needed — it never costs you</li>
            <li>· Completion photos and a note before marking a job done</li>
            <li>· A 1% fee if you cancel an accepted job before starting, 5% after</li>
          </ul>
        </div>
      </section>
      <Footer />
    </>
  );
}
