"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", icon: "home", label: "Projects", match: (p: string) => p === "/" || p.startsWith("/projects/") && !p.startsWith("/projects/new") },
  { href: "/insights", icon: "insights", label: "Win / loss insights", match: (p: string) => p.startsWith("/insights") },
  { href: "/catalog", icon: "sell", label: "Price catalog", match: (p: string) => p.startsWith("/catalog") },
  { href: "/lessons", icon: "school", label: "What we've learned", match: (p: string) => p.startsWith("/lessons") },
];

export function Shell({ children, companyName, logoUrl }: { children: React.ReactNode; companyName: string; logoUrl: string }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initials = companyName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => setOpen(!open)}>
          <span className="material-symbols-outlined">menu</span>
        </button>
        <Link href="/" className="brand">
          {logoUrl ? <img src={logoUrl} alt={companyName} /> : <span className="mark">{initials}</span>}
          <span>{logoUrl ? "" : companyName.split(" ")[0]} <small>Estimating</small></span>
        </Link>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("q");
            router.push(`/?q=${encodeURIComponent(String(q ?? ""))}`);
          }}
        >
          <span className="material-symbols-outlined">search</span>
          <input name="q" placeholder="Search projects, clients, architects" aria-label="Search" />
        </form>
        <div className="right">
          <Link href="/settings" className="icon-btn" aria-label="Settings" title="Settings">
            <span className="material-symbols-outlined">settings</span>
          </Link>
          <span className="avatar" title={companyName}>{initials}</span>
        </div>
      </header>
      <nav className={`nav${open ? " open" : ""}`} onClick={() => setOpen(false)}>
        <div className="fab-wrap">
          <Link href="/projects/new" className="fab">
            <span className="material-symbols-outlined">add</span> New estimate
          </Link>
        </div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`item${n.match(path) ? " active" : ""}`}>
            <span className="material-symbols-outlined">{n.icon}</span>
            {n.label}
          </Link>
        ))}
        <div className="section">Company</div>
        <Link href="/settings" className={`item${path.startsWith("/settings") ? " active" : ""}`}>
          <span className="material-symbols-outlined">tune</span>
          Markups & brand
        </Link>
      </nav>
      <main className="main">
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
