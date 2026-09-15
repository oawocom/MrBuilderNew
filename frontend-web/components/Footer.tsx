"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const footer_items = [
  { title: "For consumers", href: "/" },
  { title: "For contractors", href: "/for-contractors" },
  { title: "Partner with us", href: "/partner-with-us" },
  { title: "My account", href: "/profile" },
  { title: "Terms & Conditions", href: "/tos" },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/register" || pathname === "/login") return null;

  return (
    <footer className="border-t border-gray-300 bg-white py-6">
      <nav className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-8 px-4 md:flex-row lg:px-0">
        <Image src="/logo.png" alt="Logo" width={140} height={84} className="h-9 w-auto" />
        <menu className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
          {footer_items.map((item) => (
            <Link key={item.href} href={item.href} className="text-base font-semibold text-gray-500 hover:text-gray-900">
              <li>{item.title}</li>
            </Link>
          ))}
        </menu>
        <p className="text-gray-500">© 2026 Mr.Builder</p>
      </nav>
    </footer>
  );
}
