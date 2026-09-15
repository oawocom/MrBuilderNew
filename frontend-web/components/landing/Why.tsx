const points = [
  ["One price, set by the platform", "Every quote comes from MrBuilder's rate table. No haggling, no surprise add-ons — and if something genuinely changes, you get a new version to approve."],
  ["Trained, tested, supervised", "PROs complete core and safety training, pass category quizzes, and do a supervised first job before they can take yours."],
  ["Evidence at every step", "Before-work photos, a pre-job safety checklist, completion photos and a full timeline — all in your account."],
  ["Safety first", "A PRO can pause for safety at any time. You're told immediately, and it never costs you or them."],
  ["Pay after you confirm", "Payment is released only when you approve the finished work. Report an issue and payment stays on hold while MrBuilder reviews."],
  ["Care that continues", "MrCare plans keep your pergola maintained and your electronics protected, with reminders when a visit is due."],
];

export default function Why() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-20 lg:px-0">
      <div className="mb-12 text-center"><p className="text-sm font-semibold text-brand-600">Why MrBuilder</p><h2 className="mt-2 text-3xl font-semibold text-gray-900 md:text-4xl">Built for pergolas. Built around trust.</h2></div>
      <div className="grid gap-8 md:grid-cols-3">
        {points.map(([t, d]) => (
          <div key={t} className="flex gap-4">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">✓</span>
            <div><h3 className="font-semibold text-gray-900">{t}</h3><p className="mt-1 text-sm text-gray-600">{d}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}
