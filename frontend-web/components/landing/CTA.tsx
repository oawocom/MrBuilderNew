import Image from "next/image";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-8 lg:px-0 lg:py-16">
      <div className="flex items-center justify-between overflow-hidden rounded-3xl bg-gray-100 px-4 py-8 lg:px-[60px]">
        <div className="flex max-w-[484px] flex-col gap-6 lg:gap-10">
          <div className="space-y-6">
            <h3 className="font-display text-3xl leading-[45px] text-gray-900 lg:text-4xl">
              <span className="font-semibold text-brand-600">Create a Free Account, <br /></span>
              track your pergola service
            </h3>
            <p className="text-gray-500">
              Create a free MrBuilder account and access your full service dashboard — coming soon via web and
              mobile app.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-lg border border-gray-300 bg-white px-6 py-3.5 font-semibold hover:bg-gray-50">
              Log In
            </Link>
            <Link href="/register" className="rounded-lg bg-brand-600 px-6 py-3.5 font-semibold text-white shadow hover:bg-brand-700">
              Sign Up
            </Link>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <div className="relative z-[1] h-[354px] w-[529px] overflow-hidden rounded-lg bg-white">
            <Image src="/images/dashboard.jpg" alt="Mockup App" width={529} height={354} className="h-full w-full object-cover object-top" loading="lazy" quality={85} />
          </div>
          {[490, 600, 700, 800].map((size, i) => (
            <div
              key={size}
              className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3.5px]"
              style={{ width: size, height: size, borderColor: `rgba(0,0,0,${i === 0 ? 0.1 : 0.05})` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
