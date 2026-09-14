"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, User } from "@/lib/api";

const navigation_items = [
  { title: "For consumers", href: "/" },
  { title: "For contractors", href: "/for-contractors" },
  { title: "Partner with us", href: "/partner-with-us" },
  { title: "My account", href: "/profile" },
];

function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export default function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="sticky top-3 z-[2] mx-auto w-full max-w-[1280px] px-4 lg:top-4 lg:px-0">
      <header
        className={cx(
          "mt-3 flex items-center justify-between px-3 py-2 transition-all duration-300 lg:mt-6 lg:rounded-2xl lg:border lg:border-black/[0.08] lg:bg-gray-50 lg:px-4 lg:py-3",
          isScrolled && "rounded-2xl bg-white/50 backdrop-blur-sm lg:backdrop-blur-none"
        )}
      >
        <nav className="flex w-full items-center gap-2 lg:gap-4">
          <div className="flex w-full items-center justify-between">
            <Link href="/">
              <Image src="/logo.png" alt="Logo" width={140} height={84} className="h-9 w-auto lg:h-10" priority />
            </Link>
            <menu className="hidden items-center gap-0.5 lg:flex">
              {navigation_items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "px-1.5 py-0.5 text-base font-semibold text-gray-500 hover:text-gray-900",
                    pathname === item.href && "text-gray-900"
                  )}
                >
                  <li className="px-0.5">{item.title}</li>
                </Link>
              ))}
            </menu>
          </div>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            {user ? (
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {user.first_name?.[0]}
                </span>
                {user.first_name}
              </Link>
            ) : (<>
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Sign up
            </Link>
            </>)}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="cursor-pointer rounded-md p-1.5 transition-all duration-200 hover:bg-gray-50 active:scale-95 lg:hidden"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
              <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
        </nav>
      </header>

      {/* Mobile menu backdrop */}
      <div
        className={cx(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile slide-in menu */}
      <div
        className={cx(
          "fixed top-0 z-50 h-full w-72 transform bg-white shadow-2xl transition-all duration-300 ease-out lg:hidden",
          menuOpen ? "right-0" : "-right-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex justify-end border-b border-gray-100 p-3">
            <button onClick={() => setMenuOpen(false)} className="rounded-md p-1.5 hover:bg-gray-50" aria-label="Close menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 px-3 py-2">
            <ul className="space-y-0.5">
              {navigation_items.map((item, index) => (
                <li
                  key={item.href}
                  className={cx(
                    "transform transition-all duration-300 ease-out",
                    menuOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                  )}
                  style={{ transitionDelay: menuOpen ? `${index * 50}ms` : "0ms" }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-2 border-t border-gray-100 px-3 py-3">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block w-full rounded-lg border border-gray-300 bg-white py-2 text-center text-sm font-semibold text-gray-700"
            >
              Log in
            </Link>
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="block w-full rounded-lg bg-brand-600 py-2 text-center text-sm font-semibold text-white"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
