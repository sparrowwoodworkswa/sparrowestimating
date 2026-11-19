import "server-only";
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let _client: Anthropic | null = null;
export function anthropic() {
  if (!_client) _client = new Anthropic({ timeout: 30 * 60 * 1000, maxRetries: 3 });
  return _client;
}

export type Usage = { input: number; output: number; cacheRead: number };

export class AiError extends Error {}

/**
 * One structured-output call. Streams (large outputs), uses adaptive thinking (always on for Opus 5.5),
 * and opts into server-side refusal fallback.
 */
export async function structured<T extends z.ZodType>(opts: {
  system: Anthropic.Beta.BetaTextBlockParam[];
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: T;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
}): Promise<{ data: z.infer<T>; usage: Usage }> {
  const stream = anthropic().beta.messages.stream({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
    output_config: { effort: opts.effort ?? "high", format: betaZodOutputFormat(opts.schema) },
  });
  const msg = await stream.finalMessage();
  const usage: Usage = {
    input: msg.usage.input_tokens ?? 0,
    output: msg.usage.output_tokens ?? 0,
    cacheRead: msg.usage.cache_read_input_tokens ?? 0,
  };
  if (msg.stop_reason === "refusal") throw new AiError("Claude declined this request.");
  if (msg.stop_reason === "max_tokens") throw new AiError("Response hit the token limit before finishing.");
  const parsed = (msg as unknown as { parsed_output: z.infer<T> | null }).parsed_output;
  if (!parsed) throw new AiError("Claude's response could not be parsed.");
  return { data: parsed, usage };
}

/** Upload a plan file to the Claude Files API so every pass can reference it by id without re-sending bytes. */
export async function uploadToClaude(filename: string, data: Buffer, mime: string): Promise<string> {
  const f = await anthropic().files.upload({ file: await toFile(data, filename, { type: mime }) });
  return f.id;
}

export function mimeFor(filename: string) {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "txt" || ext === "md" || ext === "csv") return "text/plain";
  return "application/pdf";
}
