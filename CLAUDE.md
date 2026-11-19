# Sparrow Estimating

Estimating app + estimating standards for Sparrow Woodworks (cost-plus GC, Kitsap / Bainbridge / Olympic Peninsula, WA).

## The app
- Next.js 15 App Router + TypeScript, Drizzle ORM on Postgres (embedded PGlite locally in `./data`, `DATABASE_URL` in production). Schema: `src/db/schema.ts`; DDL runs idempotently on startup from `src/db/ddl.ts`. Add columns with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- AI pipeline in `src/lib/ai/`: Anthropic TypeScript SDK, `claude-opus-5-5`, structured outputs via Zod (`betaZodOutputFormat`), plan files via the Files API, cached system + plan prefix shared by parallel work-package passes. Keep the system prompt byte-identical across passes so caching works.
- Internal UI follows Google Material 3 patterns (top app bar, nav drawer, tonal buttons, chips, cards) themed with Sparrow's colors (`src/app/globals.css`). Client-facing pages (`/p/[token]`, `/bid/[pkg]`) use Sparrow's editorial house style.
- Verify with `npm run build` (typechecks) and `npm run check:schemas`.

## Estimating rules
When estimating a project or building a proposal outside the app, follow `skills/sparrow-estimate-proposal/SKILL.md`: CSI divisions, labor rates, markups (1.5% insurance/B&O, 15% fee, no contingency, WA sales tax as its own line), house design and writing style. The app's Settings page holds the live version of these standards, and its Lessons table holds what's been learned since.

- Never invent names, numbers or bios. Mark unknowns with a "fill in" chip.
- Client copy: plain, short sentences, no em dashes.
