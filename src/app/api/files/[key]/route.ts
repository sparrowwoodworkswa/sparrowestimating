import { getFile } from "@/lib/storage";
import { mimeFor } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

// Serves locally stored uploads (plans, logo, proposal images). Blob-stored files are served by Vercel directly.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const k = decodeURIComponent(key);
  if (!k.startsWith("local:") || k.includes("..") || k.includes("/")) return new Response("Not found", { status: 404 });
  try {
    const buf = await getFile(k);
    return new Response(new Uint8Array(buf), { headers: { "content-type": mimeFor(k), "cache-control": "private, max-age=3600" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
