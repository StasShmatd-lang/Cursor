import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const EVENTS_TABLE = `create table if not exists events (
  id text primary key,
  host_key_hash text not null,
  vote_key_hash text not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`;

const globalDb = globalThis as unknown as {
  votingPool?: pg.Pool;
  votingPoolUrl?: string;
  votingLocal?: Promise<PGlite>;
};

function databaseUrl() {
  const env = process.env as Record<string, string | undefined>;
  return (env.DATABASE_URL ?? "").trim();
}

function poolFor(url: string) {
  if (globalDb.votingPool && globalDb.votingPoolUrl !== url) {
    void globalDb.votingPool.end().catch(() => undefined);
    globalDb.votingPool = undefined;
  }
  const ssl = /sslmode=disable/i.test(url) || /localhost|127\.0\.0\.1/.test(url)
    ? undefined
    : { rejectUnauthorized: false };
  globalDb.votingPool ??= new pg.Pool({ connectionString: url, max: 5, ssl });
  globalDb.votingPoolUrl = url;
  return globalDb.votingPool;
}

export type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return withTx((q) => q<T>(text, params));
}

function asQuery(run: (text: string, params: unknown[]) => Promise<unknown[]>): Query {
  return (async (text, params = []) => run(text, params)) as Query;
}

async function ensureEvents(q: Query) {
  await q(EVENTS_TABLE);
}

export async function withTx<T>(fn: (q: Query) => Promise<T>): Promise<T> {
  const url = databaseUrl();
  if (url !== "") {
    const client = await poolFor(url).connect();
    try {
      await client.query("begin");
      const q = asQuery(async (text, params) => {
        const res = await client.query(text, params);
        return res.rows;
      });
      await ensureEvents(q);
      const result = await fn(q);
      await client.query("commit");
      return result;
    } catch (error) {
      try {
        await client.query("rollback");
      } catch {
        /* connection already closed */
      }
      throw error;
    } finally {
      client.release();
    }
  }

  globalDb.votingLocal ??= startLocal().catch((error: unknown) => {
    globalDb.votingLocal = undefined;
    throw error;
  });
  const db = await globalDb.votingLocal;
  return db.transaction(async (tx) => {
    const q = asQuery(async (text, params) => {
      const res = await tx.query(text, params);
      return res.rows;
    });
    await ensureEvents(q);
    return fn(q);
  });
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => [] as string[]))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
