export default function FeaturedIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm">
      {children}
    </div>
  );
}
