"use client";
import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="row" style={{ flex: "1 1 360px", flexWrap: "nowrap", background: "var(--md-surface-container)", borderRadius: 24, padding: "0 6px 0 16px", height: 44, minWidth: 0 }}>
      <span className="material-symbols-outlined muted">link</span>
      <span className="small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{url}</span>
      <button
        className="btn text small"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        }}
      >
        {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
