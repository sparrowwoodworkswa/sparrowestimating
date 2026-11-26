"use client";
import { useTransition } from "react";
import { setSectionCode } from "@/app/shop-actions";

export function SectionCode({ jobId, section, code, options }: { jobId: number; section: string; code: string; options: { code: string; label: string }[] }) {
  const [pending, start] = useTransition();
  return (
    <select
      className="cell"
      style={{ width: 230 }}
      disabled={pending}
      defaultValue={code}
      onChange={(e) => start(() => setSectionCode(jobId, section, e.target.value))}
    >
      <option value="">Pick a cost code</option>
      {options.map((o) => (
        <option key={o.code} value={o.code}>{o.code} {o.label}</option>
      ))}
    </select>
  );
}
