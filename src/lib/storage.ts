import "server-only";
import fs from "fs/promises";
import path from "path";

const LOCAL_DIR = "./data/uploads";

/** Stores a file and returns a storage key. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set, else local disk. */
export async function putFile(name: string, data: Buffer, contentType: string): Promise<string> {
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`plans/${key}`, data, { access: "public", contentType, addRandomSuffix: false });
    return blob.url;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, key), data);
  return `local:${key}`;
}

export async function getFile(key: string): Promise<Buffer> {
  if (key.startsWith("local:")) return fs.readFile(path.join(LOCAL_DIR, key.slice(6)));
  const res = await fetch(key);
  if (!res.ok) throw new Error(`Could not read stored file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteFile(key: string) {
  if (key.startsWith("local:")) {
    await fs.rm(path.join(LOCAL_DIR, key.slice(6)), { force: true });
  } else if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import("@vercel/blob");
    await del(key);
  }
}
