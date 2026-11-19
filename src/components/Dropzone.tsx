"use client";
import { useRef, useState } from "react";

export function Dropzone({ name, accept = ".pdf,.png,.jpg,.jpeg,.webp,.txt", onFiles }: { name: string; accept?: string; onFiles?: (f: FileList) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  return (
    <label
      className={`dropzone${over ? " over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (ref.current && e.dataTransfer.files.length) {
          ref.current.files = e.dataTransfer.files;
          setFiles(Array.from(e.dataTransfer.files));
          onFiles?.(e.dataTransfer.files);
        }
      }}
    >
      <input
        ref={ref}
        type="file"
        name={name}
        multiple
        accept={accept}
        hidden
        onChange={(e) => {
          setFiles(Array.from(e.target.files ?? []));
          if (e.target.files) onFiles?.(e.target.files);
        }}
      />
      <span className="material-symbols-outlined">cloud_upload</span>
      <div className="title-m" style={{ marginTop: 8 }}>Drag plans here or click to browse</div>
      {files.length > 0 && (
        <div className="chip-set" style={{ justifyContent: "center", marginTop: 12 }}>
          {files.map((f) => (
            <span key={f.name} className="chip accent">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>description</span>
              {f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB
            </span>
          ))}
        </div>
      )}
    </label>
  );
}
