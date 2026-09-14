import Image from "next/image";

const items = [
  "Book new service appointments",
  "Track technician arrival in real-time",
  "Access warranty documents",
  "Review past service visits",
];

export default function ComingSoon() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-8 lg:px-0 lg:py-16">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="flex flex-col gap-6">
          <h3 className="font-display text-3xl font-medium lg:text-4xl">
            Manage everything from the <span className="text-brand-600">MrBuilder app</span>
          </h3>
          <ul className="space-y-4">
            {items.map((i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-gray-700">{i}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-3">
            <Image src="/images/down_as.svg" alt="download on App Store" width={135} height={44} className="h-11 w-auto" />
            <Image src="/images/down_gp.svg" alt="download on Google Play" width={150} height={44} className="h-11 w-auto" />
          </div>
        </div>
        <div className="flex justify-center">
          <Image src="/images/mockup_app.svg" alt="iphone app mockup" width={420} height={640} className="h-auto w-full max-w-md" />
        </div>
      </div>
    </section>
  );
}
