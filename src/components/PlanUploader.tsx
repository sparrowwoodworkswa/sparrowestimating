"use client";
import { upload } from "@vercel/blob/client";
import { registerPlanFiles, uploadFiles } from "@/app/actions";

/** Uploads plan files: straight to Vercel Blob when it's configured (large sets), else through the server. */
export async function uploadPlans(projectId: number, files: File[], blobEnabled: boolean, onProgress?: (msg: string) => void) {
  if (!files.length) return;
  if (blobEnabled) {
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
