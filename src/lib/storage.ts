import "server-only";
import fs from "fs/promises";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * File storage, in order of preference:
 *  - Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (what the Vercel Supabase integration adds).
 *    Plans go in a private "plans" bucket; logos and proposal images in a public "assets" bucket.
 *  - Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 *  - Local disk (./data/uploads) for development.
 * Keys: "supabase:plans/<path>", a public https URL, a Blob URL, or "local:<name>".
 */

const LOCAL_DIR = "./data/uploads";
export const PLANS_BUCKET = "plans";
export const ASSETS_BUCKET = "assets";

export const supabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const supabaseAnonKey = () => process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export type StorageMode = "supabase" | "blob" | "local";
export function storageMode(): StorageMode {
  if (supabaseUrl() && serviceKey()) return "supabase";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return "local";
}

let _sb: SupabaseClient | null = null;
let _buckets: Promise<void> | null = null;
async function sb() {
  if (!_sb) {
    const { createClient } = await import("@supabase/supabase-js");
    _sb = createClient(supabaseUrl(), serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  }
  // Create the two buckets the first time the app runs; ignore "already exists".
  if (!_buckets) {
    const client = _sb;
    _buckets = (async () => {
      const { data } = await client.storage.listBuckets();
      const have = new Set((data ?? []).map((b) => b.id));
      if (!have.has(PLANS_BUCKET)) await client.storage.createBucket(PLANS_BUCKET, { public: false });
      if (!have.has(ASSETS_BUCKET)) await client.storage.createBucket(ASSETS_BUCKET, { public: true });
    })().catch((e) => {
      _buckets = null;
      throw e;
    });
  }
  await _buckets;
  return _sb;
}

const safeName = (name: string) => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name.replace(/[^a-zA-Z0-9._-]+/g, "_")}`;

/** Stores a file and returns its storage key. Use visibility "public" for images shown on client proposals. */
export async function putFile(name: string, data: Buffer, contentType: string, visibility: "private" | "public" = "private"): Promise<string> {
  const key = safeName(name);
  const mode = storageMode();
  if (mode === "supabase") {
    const client = await sb();
    const bucket = visibility === "public" ? ASSETS_BUCKET : PLANS_BUCKET;
    const { error } = await client.storage.from(bucket).upload(key, data, { contentType, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    if (visibility === "public") return client.storage.from(bucket).getPublicUrl(key).data.publicUrl;
    return `supabase:${bucket}/${key}`;
  }
  if (mode === "blob") {
    const { put } = await import("@vercel/blob");
    const blob = await put(`plans/${key}`, data, { access: "public", contentType, addRandomSuffix: false });
    return blob.url;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, key), data);
  return `local:${key}`;
}

/** A one-time URL the browser can upload a large plan file to directly (Supabase mode). */
export async function createPlanUploadUrl(filename: string) {
  const client = await sb();
  const key = safeName(filename);
  const { data, error } = await client.storage.from(PLANS_BUCKET).createSignedUploadUrl(key);
  if (error || !data) throw new Error(`Could not start upload: ${error?.message}`);
  return { path: data.path, token: data.token, storageKey: `supabase:${PLANS_BUCKET}/${data.path}` };
}

function splitSupabaseKey(key: string) {
  const rest = key.slice("supabase:".length);
  const i = rest.indexOf("/");
  return { bucket: rest.slice(0, i), objectPath: rest.slice(i + 1) };
}

export async function getFile(key: string): Promise<Buffer> {
  if (key.startsWith("local:")) return fs.readFile(path.join(LOCAL_DIR, key.slice(6)));
  if (key.startsWith("supabase:")) {
    const { bucket, objectPath } = splitSupabaseKey(key);
    const { data, error } = await (await sb()).storage.from(bucket).download(objectPath);
    if (error || !data) throw new Error(`Could not read stored file: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  const res = await fetch(key);
  if (!res.ok) throw new Error(`Could not read stored file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteFile(key: string) {
  if (key.startsWith("local:")) {
    await fs.rm(path.join(LOCAL_DIR, key.slice(6)), { force: true });
  } else if (key.startsWith("supabase:")) {
    const { bucket, objectPath } = splitSupabaseKey(key);
    await (await sb()).storage.from(bucket).remove([objectPath]);
  } else if (process.env.BLOB_READ_WRITE_TOKEN && key.includes("blob.vercel-storage.com")) {
    const { del } = await import("@vercel/blob");
    await del(key);
  }
}
