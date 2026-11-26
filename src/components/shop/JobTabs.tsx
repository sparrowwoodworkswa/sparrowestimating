"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function JobTabs({ id }: { id: number }) {
  const p = usePathname();
  const tabs = [
    { href: `/shop/${id}`, label: "Estimate", on: p === `/shop/${id}` },
    { href: `/shop/${id}/plans`, label: "Plans and takeoff", on: p.endsWith("/plans") },
    { href: `/shop/${id}/actuals`, label: "Actuals", on: p.endsWith("/actuals") },
    { href: `/shop/${id}/settings`, label: "Job settings", on: p.endsWith("/settings") },
  ];
  return (
    <div className="sw-tabs">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={t.on ? "on" : ""}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
