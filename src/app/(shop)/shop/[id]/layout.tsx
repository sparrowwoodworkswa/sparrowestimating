import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { JobTabs } from "@/components/shop/JobTabs";
import { statusLabel } from "@/lib/shop/model";

// The takeoff runs after the response, inside this segment's time limit.
export const maxDuration = 800;

export default async function JobLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [job] = await db.select().from(schema.shopJobs).where(eq(schema.shopJobs.id, Number(id)));
  if (!job) notFound();
  return (
    <>
      <div className="eyebrow">Shop estimate · {statusLabel(job.status)}</div>
      <h1 className="doc-title" style={{ marginTop: 8 }}>{job.name}</h1>
      <div className="doc-subtitle">
        {[job.architect, job.client, job.location, job.costYear].filter(Boolean).join(" · ")}
      </div>
      <JobTabs id={job.id} />
      {children}
    </>
  );
}
