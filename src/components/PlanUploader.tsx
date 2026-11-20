"use client";
import { upload } from "@vercel/blob/client";
import { registerPlanFiles, startPlanUpload, uploadFiles } from "@/app/actions";

export type UploadTarget = { mode: "supabase"; supabaseUrl: string; anonKey: string } | { mode: "blob" } | { mode: "local" };

/** Uploads plan files straight from the browser to storage (Supabase or Vercel Blob), so big sets skip Vercel's 4.5 MB request limit. */
export async function uploadPlans(projectId: number, files: File[], target: UploadTarget, onProgress?: (msg: string) => void) {
  if (!files.length) return;
  if (target.mode === "supabase") {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(target.supabaseUrl, target.anonKey, { auth: { persistSession: false } });
    const done: { filename: string; url: string; size: number }[] = [];
    for (const f of files) {
      onProgress?.(`Uploading ${f.name}…`);
      const { path, token, storageKey } = await startPlanUpload(f.name);
      const { error } = await client.storage.from("plans").uploadToSignedUrl(path, token, f, { contentType: f.type || "application/pdf" });
      if (error) throw new Error(`${f.name}: ${error.message}${f.size > 50 * 1024 * 1024 ? " (Supabase's free plan caps files at 50 MB; split the set or raise the limit in Supabase)" : ""}`);
      done.push({ filename: f.name, url: storageKey, size: f.size });
    }
    await registerPlanFiles(projectId, done);
  } else if (target.mode === "blob") {
    const done: { filename: string; url: string; size: number }[] = [];
    for (const f of files) {
      onProgress?.(`Uploading ${f.name}…`);
      const b = await upload(`plans/${f.name}`, f, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
        multipart: f.size > 20 * 1024 * 1024,
        onUploadProgress: (p) => onProgress?.(`Uploading ${f.name}… ${Math.round(p.percentage)}%`),
      });
      done.push({ filename: f.name, url: b.url, size: f.size });
    }
    await registerPlanFiles(projectId, done);
  } else {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    onProgress?.("Uploading…");
    await uploadFiles(projectId, fd);
  }
}
