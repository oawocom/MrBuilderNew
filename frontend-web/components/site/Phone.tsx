export function Phone({ src, alt, className = "", label, tall = false }: { src: string; alt: string; className?: string; label?: string; tall?: boolean }) {
  return (
    <figure className={`flex flex-col items-center ${className}`}>
      <div className="relative w-full max-w-[260px] rounded-[36px] border-[6px] border-[#181D27] bg-[#181D27] shadow-[0_24px_60px_-20px_rgba(24,29,39,.45)]">
        <div className="absolute left-1/2 top-2 z-10 h-[18px] w-[80px] -translate-x-1/2 rounded-full bg-[#181D27]" />
        <div className={`overflow-hidden rounded-[30px] bg-white ${tall ? "max-h-[520px]" : ""}`}><img src={src} alt={alt} className="block w-full" loading="lazy" /></div>
      </div>
      {label && <figcaption className="mt-3 text-center text-[13px] font-medium text-gray-500">{label}</figcaption>}
    </figure>
  );
}
