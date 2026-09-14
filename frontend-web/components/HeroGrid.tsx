import Image from "next/image";

export default function HeroGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 flex items-start justify-center overflow-hidden">
      <Image src="/images/block.svg" alt="" width={1200} height={800} className="min-w-[1000px] opacity-70" />
    </div>
  );
}
