"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import type { UploadTarget } from "@/components/PlanUploader";
import { registerShopFiles, startShopUpload, uploadShopFiles } from "@/app/shop-actions";

/** Sends plan files straight from the browser to storage, the same way the GC side does. */
export function ShopUploader({ jobId, target }: { jobId: number; target: UploadTarget }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function send(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    try {
      if (target.mode === "supabase") {
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(target.supabaseUrl, target.anonKey, { auth: { persistSession: false } });
        const done: { filename: string; url: string; size: number }[] = [];
        for (const f of files) {
          setMsg(`Uploading ${f.name}`);
          const { path, token, storageKey } = await startShopUpload(f.name);
          const { error } = await client.storage.from("plans").uploadToSignedUrl(path, token, f, { contentType: f.type || "application/pdf" });
          if (error) throw new Error(`${f.name}: ${error.message}`);
          done.push({ filename: f.name, url: storageKey, size: f.size });
        }
        await registerShopFiles(jobId, done);
      } else if (target.mode === "blob") {
        const done: { filename: string; url: string; size: number }[] = [];
        for (const f of files) {
          setMsg(`Uploading ${f.name}`);
          const b = await upload(`plans/${f.name}`, f, { access: "public", handleUploadUrl: "/api/blob-upload", multipart: f.size > 20 * 1024 * 1024 });
          done.push({ filename: f.name, url: b.url, size: f.size });
        }
        await registerShopFiles(jobId, done);
      } else {
        const fd = new FormData();
        for (const f of files) fd.append("files", f);
        setMsg("Uploading");
        await uploadShopFiles(jobId, fd);
      }
      setMsg("Uploaded.");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row">
      <label className="btn line" style={{ cursor: busy ? "default" : "pointer" }}>
        {busy ? "Uploading" : "Add plan files"}
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          style={{ display: "none" }}
          disabled={busy}
          onChange={(e) => send(Array.from(e.target.files ?? []))}
        />
      </label>
      <span className="caption">{msg || "PDF plan sets or images. Millwork sheets, elevations and details are what the takeoff reads."}</span>
    </div>
  );
}
