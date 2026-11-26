"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startShopTakeoff } from "@/app/shop-actions";

type Status = { status: string; step: string; error: string | null };

export function TakeoffRunner({ jobId, initial, hasFiles, hasOwn }: { jobId: number; initial: Status; hasFiles: boolean; hasOwn: boolean }) {
  const [st, setSt] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const running = st.status === "running";

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/shop/${jobId}/status`, { cache: "no-store" });
      if (!r.ok) return;
      const next: Status = await r.json();
      setSt(next);
      if (next.status !== "running") {
        clearInterval(t);
        router.refresh();
      }
    }, 4000);
    return () => clearInterval(t);
  }, [running, jobId, router]);

  return (
    <div>
      <div className="row">
        <button
          className="btn"
          type="button"
          disabled={!hasFiles || running || pending}
          onClick={() =>
            start(async () => {
              if (st.status === "done" && !confirm("Run the takeoff again? It replaces the earlier Claude takeoff. Your own lines are not touched.")) return;
              await startShopTakeoff(jobId);
              setSt({ status: "running", step: "Starting", error: null });
            })
          }
        >
          {running ? "Takeoff running" : st.status === "done" ? "Run takeoff again" : "Run Claude takeoff"}
        </button>
        <span className="caption">
          {running
            ? `${st.step}. This takes 3 to 10 minutes. You can leave this page.`
            : !hasFiles
              ? "Add the plan set first."
              : hasOwn
                ? "The takeoff goes in beside your estimate as its own source. It doesn't change your lines."
                : "The job has no lines yet, so the takeoff becomes the starting estimate."}
        </span>
      </div>
      {st.status === "error" && <p className="note">The takeoff failed: {st.error}</p>}
    </div>
  );
}
