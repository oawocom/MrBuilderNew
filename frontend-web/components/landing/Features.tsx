const features = [
  {
    title: "Annual Maintenance",
    text: "Keep your pergola in top condition with our comprehensive maintenance plans.",
  },
  {
    title: "Expert Repairs",
    text: "We fix motors, receivers, leaks, drainage systems, and all pergola components.",
  },
  {
    title: "Brand Specialists",
    text: "Trained technicians for modern aluminum systems, louvers, and retractables.",
  },
];

export default function Features() {
  return (
    <section id="about" className="mx-auto max-w-[1280px] px-4 py-8 lg:px-0 lg:py-16">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
