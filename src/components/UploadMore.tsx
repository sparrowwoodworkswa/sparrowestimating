"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dropzone } from "./Dropzone";
import { uploadPlans } from "./PlanUploader";

export function UploadMore({ projectId, blobEnabled }: { projectId: number; blobEnabled: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="stack"
      style={{ marginTop: 12, gap: 10 }}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const files = (new FormData(form).getAll("files") as File[]).filter((f) => f && f.size);
        if (!files.length) return;
        setError(null);
        try {
          await uploadPlans(projectId, files, blobEnabled, setStatus);
          form.reset();
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        }
        setStatus(null);
      }}
    >
      <Dropzone name="files" />
      {error && <div className="banner bad small">{error}</div>}
      <button className="btn tonal" disabled={!!status}>
        <span className="material-symbols-outlined">{status ? "progress_activity" : "upload"}</span>
        {status ?? "Upload"}
      </button>
    </form>
  );
}
