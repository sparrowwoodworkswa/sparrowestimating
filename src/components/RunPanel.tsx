"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AiRun } from "@/db/schema";

type Starter = (projectId: number) => Promise<{ runId?: number; error?: string }>;

export function RunPanel({
  projectId,
  initial,
  start,
  label,
  icon = "auto_awesome",
  kind,
  confirmText,
  disabled,
}: {
  projectId: number;
  initial: AiRun | null;
  start: Starter;
  label: string;
  icon?: string;
  kind?: string;
  confirmText?: string;
  disabled?: boolean;
}) {
  const [run, setRun] = useState<AiRun | null>(initial && (!kind || initial.kind === kind) ? initial : null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startT] = useTransition();
  const router = useRouter();
  const running = run?.status === "running";

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/projects/${projectId}/run`, { cache: "no-store" });
      if (!r.ok) return;
      const next: AiRun | null = await r.json();
      setRun(next);
      if (next && next.status !== "running") {
        clearInterval(t);
        router.refresh();
      }
    }, 2500);
    return () => clearInterval(t);
  }, [running, projectId, router]);

  const elapsed = run ? Math.round(((run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now()) - new Date(run.startedAt).getTime()) / 1000) : 0;
  const cost = run ? (run.inputTokens * 4 + run.outputTokens * 20 + run.cacheReadTokens * 0.2) / 1e6 : 0;

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row">
        <button
          className="btn"
          disabled={pending || running || disabled}
          onClick={() => {
            if (confirmText && !confirm(confirmText)) return;
            setErr(null);
            startT(async () => {
              const r = await start(projectId);
              if (r.error) setErr(r.error);
              else {
                const res = await fetch(`/api/projects/${projectId}/run`, { cache: "no-store" });
                setRun(await res.json());
              }
            });
          }}
        >
          <span className="material-symbols-outlined">{running ? "progress_activity" : icon}</span>
          {running ? "Working…" : label}
        </button>
        {run && (
          <span className="small muted">
            {run.status === "done" ? "Last run finished" : run.status === "error" ? "Last run failed" : run.step} · {Math.floor(elapsed / 60)}m {elapsed % 60}s
            {cost > 0 ? ` · about $${cost.toFixed(2)} in Claude usage` : ""}
          </span>
        )}
      </div>
      {running && <div className="progress" />}
      {err && <div className="banner bad"><span className="material-symbols-outlined">error</span>{err}</div>}
      {run?.status === "error" && run.error && <div className="banner bad"><span className="material-symbols-outlined">error</span>{run.error}</div>}
      {run && run.log.length > 0 && (running || run.status === "error") && <div className="log">{run.log.join("\n")}</div>}
    </div>
  );
}
