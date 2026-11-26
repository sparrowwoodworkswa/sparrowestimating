"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/shop", label: "Jobs", on: (p: string) => p === "/shop" || /^\/shop\/(\d+|new)/.test(p) },
  { href: "/shop/library", label: "Production library", on: (p: string) => p.startsWith("/shop/library") },
  { href: "/shop/prices", label: "Price book", on: (p: string) => p.startsWith("/shop/prices") },
];

export function ShopNav() {
  const p = usePathname();
  return (
    <nav className="sw-nav">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} className={n.on(p) ? "on" : ""}>
          {n.label}
        </Link>
      ))}
      <Link href="/" className="gc">
        GC estimating
      </Link>
    </nav>
  );
}
