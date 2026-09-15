import Link from "next/link";

const perks = [
  ["Jobs near you, already priced", "No quoting, no chasing. Accept jobs in the categories you're qualified for and see your net before you say yes."],
  ["Training that activates you", "Core, safety and category modules with short quizzes, then one supervised job. Complete it in the PRO app."],
  ["Protected by evidence", "Before-work photos and a checklist before every start. Pause for safety whenever you need to — no penalty."],
  ["Paid fast", "Earnings land in your balance the moment the customer confirms. Withdraw when you want, or automatically."],
  ["Parts without the hassle", "Order from Mr Supply straight to the job site — paid by you, by the customer's cart, or added to their invoice."],
];

export default function ForPros() {
  return (
    <section id="pros" className="mx-auto max-w-[1280px] px-4 py-20 lg:px-0">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-brand-600">For contractors</p>
          <h2 className="mt-2 text-3xl font-semibold text-gray-900 md:text-4xl">Do the work. We handle the rest.</h2>
          <ul className="mt-6 space-y-4">{perks.map(([t, d]) => <li key={t}><h3 className="font-semibold text-gray-900">{t}</h3><p className="text-sm text-gray-600">{d}</p></li>)}</ul>
          <Link href="/register?role=contractor" className="mt-8 inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800">Apply as a MrBuilder PRO</Link>
        </div>
        <div className="rounded-2xl bg-gray-900 p-8 text-white">
          <p className="text-sm text-gray-400">A typical installation</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span>Customer total</span><span>$5,320</span></div>
            <div className="flex justify-between text-gray-400"><span>MrBuilder fee</span><span>−$532</span></div>
            <div className="flex justify-between border-t border-gray-700 pt-3 text-lg font-semibold"><span>Your net</span><span>$4,788</span></div>
            <div className="flex justify-between text-emerald-400"><span>+ Customer tip</span><span>100% yours</span></div>
          </div>
          <p className="mt-6 text-xs text-gray-400">Example from the current rate table. Fees and rates are set by MrBuilder and shown before you accept.</p>
        </div>
      </div>
    </section>
  );
}
