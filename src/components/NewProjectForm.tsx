"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createProjectRecord, startEstimate } from "@/app/actions";
import { uploadPlans } from "./PlanUploader";

export function NewProjectForm({ blobEnabled, hasKey, children }: { blobEnabled: boolean; hasKey: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      ref={ref}
      className="stack"
      style={{ maxWidth: 920 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        const files = (fd.getAll("files") as File[]).filter((f) => f && f.size);
        fd.delete("files");
        try {
          setStatus("Creating project…");
          const id = await createProjectRecord(fd);
          await uploadPlans(id, files, blobEnabled, setStatus);
          if (fd.get("start") === "1" && hasKey && files.length) {
            setStatus("Starting the ROM…");
            const r = await startEstimate(id);
            if (r.error) setError(r.error);
          }
          router.push(`/projects/${id}`);
        } catch (err) {
          setError((err as Error).message);
          setStatus(null);
        }
      }}
    >
      {children}
      {error && <div className="banner bad"><span className="material-symbols-outlined">error</span>{error}</div>}
      <div className="row">
        <label className="check">
          <input type="checkbox" name="start" value="1" defaultChecked={hasKey} disabled={!hasKey} /> Start the ROM as soon as plans upload
        </label>
        <div className="spacer" />
        {status && <span className="small muted">{status}</span>}
        <button className="btn" type="submit" disabled={!!status}>
          <span className="material-symbols-outlined">{status ? "progress_activity" : "auto_awesome"}</span>
          {status ? "Working…" : "Create project"}
        </button>
      </div>
    </form>
  );
}
