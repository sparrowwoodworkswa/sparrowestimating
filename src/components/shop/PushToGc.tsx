"use client";
import { useState, useTransition } from "react";
import { pushToGcEstimate } from "@/app/shop-actions";

export function PushToGc({ jobId, gcName }: { jobId: number; gcName: string | null }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="row">
      <button
        className="btn line"
        type="button"
        disabled={pending || !gcName}
        title={gcName ? `Adds one line per section to ${gcName}, at cost before the GC fee` : "Link a GC project in Job settings first"}
        onClick={() => start(async () => setMsg(await pushToGcEstimate(jobId)))}
      >
        {pending ? "Sending" : gcName ? `Send to GC estimate: ${gcName}` : "Send to GC estimate"}
      </button>
      {msg && <span className="caption">{msg}</span>}
    </span>
  );
}
