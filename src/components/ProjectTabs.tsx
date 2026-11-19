"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProjectTabs({ id }: { id: number }) {
  const path = usePathname();
  const base = `/projects/${id}`;
  const tabs = [
    { href: base, label: "Plans & takeoff", icon: "architecture" },
    { href: `${base}/estimate`, label: "ROM estimate", icon: "request_quote" },
    { href: `${base}/trades`, label: "Trade bid packages", icon: "handyman" },
    { href: `${base}/proposal`, label: "Proposal", icon: "description" },
    { href: `${base}/outcome`, label: "Outcome & learning", icon: "emoji_events" },
  ];
  return (
    <nav className="tabs">
      {tabs.map((t) => {
        const active = t.href === base ? path === base : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? "active" : ""}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
