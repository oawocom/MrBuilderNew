const steps = [
  { n: "1", title: "Describe your pergola", text: "Size, type, mounting, screens and accessories — takes two minutes. Or book a $99 inspection and a PRO measures on site; the fee is credited to your job." },
  { n: "2", title: "Get your quote instantly", text: "MrBuilder prices every job from one transparent rate table. Contractors never set the price, and it doesn't change after you approve." },
  { n: "3", title: "A qualified PRO does the work", text: "Only contractors who passed our safety and category training — and a supervised first job — can accept. You see them on the way, arriving, starting, and before-work photos." },
  { n: "4", title: "Confirm, then pay", text: "You review the completion photos and approve. Payment is released only then. Problems? Report it and MrBuilder steps in." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-[1280px] px-4 py-20 lg:px-0">
      <div className="mb-12 text-center"><p className="text-sm font-semibold text-brand-600">How it works</p><h2 className="mt-2 text-3xl font-semibold text-gray-900 md:text-4xl">From request to done — no surprises</h2></div>
      <div className="grid gap-6 md:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="rounded-2xl border border-gray-200 bg-white p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-700">{s.n}</span>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{s.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
