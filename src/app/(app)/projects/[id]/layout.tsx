import Link from "next/link";
import { notFound } from "next/navigation";
import { getLines, getProject } from "@/lib/data";
import { computeTotals, usd, num } from "@/lib/totals";
import { statusInfo } from "@/lib/csi";
import { ProjectTabs } from "@/components/ProjectTabs";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProject(Number(id));
  if (!p) notFound();
  const lines = await getLines(p.id);
  const t = computeTotals(lines, p.markups);
  const total = lines.length ? t.total : p.contractTotalOverride;
  const st = statusInfo(p.status);
  return (
    <>
      <div className="row muted small" style={{ marginBottom: 8 }}>
        <Link href="/">Projects</Link>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
        <span>{p.name}</span>
      </div>
      <div className="page-head" style={{ marginBottom: 8 }}>
        <div>
          <div className="row">
            <h1 className="headline">{p.name}</h1>
            <span className={`chip ${st.tone}`}>{st.label}</span>
          </div>
          <p className="muted">
            {[p.client, p.architect, p.city, p.totalSf ? `${num(p.totalSf)} SF` : null, p.finishLevel].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="label">ROM contract total</div>
          <div className="headline num">{usd(total)}</div>
          {total && p.totalSf ? <div className="small muted">{usd(total / p.totalSf)}/SF incl. tax</div> : null}
        </div>
      </div>
      <ProjectTabs id={p.id} />
      {children}
    </>
  );
}
