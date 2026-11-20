import "server-only";
import { storageMode, supabaseUrl, supabaseAnonKey } from "./storage";
import type { UploadTarget } from "@/components/PlanUploader";

/** Tells the browser where plan files should go. Only public values (URL, anon key) leave the server. */
export function uploadTarget(): UploadTarget {
  const mode = storageMode();
  if (mode === "supabase") return { mode, supabaseUrl: supabaseUrl(), anonKey: supabaseAnonKey() };
  return { mode };
}
