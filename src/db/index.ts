import "server-only";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { DDL } from "./ddl";
import { seedIfEmpty } from "./seed";

type DB = ReturnType<typeof drizzlePglite<typeof schema>>;

const g = globalThis as unknown as { __sparrowDb?: Promise<DB> };

async function init(): Promise<DB> {
  let db: DB;
  if (process.env.DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    const client = postgres(process.env.DATABASE_URL, { max: 5, prepare: false });
    await client.unsafe(DDL);
    db = drizzlePostgres(client, { schema }) as unknown as DB;
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const fs = await import("fs");
    fs.mkdirSync("./data", { recursive: true });
    const client = new PGlite("./data/pglite");
    await client.exec(DDL);
    db = drizzlePglite(client, { schema });
  }
  await seedIfEmpty(db);
  return db;
}

export function getDb(): Promise<DB> {
  if (!g.__sparrowDb) g.__sparrowDb = init();
  return g.__sparrowDb;
}

export { schema };
export type { DB };
