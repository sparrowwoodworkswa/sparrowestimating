import "server-only";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { DDL } from "./ddl";
import { seedIfEmpty } from "./seed";
import { seedShopIfEmpty } from "./shop-seed";

type DB = ReturnType<typeof drizzlePglite<typeof schema>>;

const g = globalThis as unknown as { __sparrowDb?: Promise<DB> };

async function init(): Promise<DB> {
  let db: DB;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const postgres = (await import("postgres")).default;
    // Supabase/Vercel connection strings carry extra query params (e.g. supa=base-pooler.x) that
    // postgres-js would forward to the server as settings and fail on. Keep only what we need.
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (k !== "sslmode") u.searchParams.delete(k);
    const local = ["localhost", "127.0.0.1"].includes(u.hostname);
    const client = postgres(u.toString(), { max: 5, prepare: false, ssl: local ? false : "require" });
    await client.unsafe(DDL);
    db = drizzlePostgres(client, { schema }) as unknown as DB;
  } else {
    if (process.env.VERCEL) {
      throw new Error("No database connected. In Vercel, open the project's Storage tab, add a Postgres database (Neon), connect it to this project, then redeploy. It sets DATABASE_URL.");
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const fs = await import("fs");
    fs.mkdirSync("./data", { recursive: true });
    const client = new PGlite("./data/pglite");
    await client.exec(DDL);
    db = drizzlePglite(client, { schema });
  }
  await seedIfEmpty(db);
  await seedShopIfEmpty(db);
  return db;
}

export function getDb(): Promise<DB> {
  if (!g.__sparrowDb) g.__sparrowDb = init();
  return g.__sparrowDb;
}

export { schema };
export type { DB };
