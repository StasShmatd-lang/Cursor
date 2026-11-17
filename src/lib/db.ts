import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

const globalDb = globalThis as unknown as {
  votingPool?: pg.Pool;
  votingLocal?: Promise<PGlite>;
};

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

export async function withTx<T>(fn: (q: Query) => Promise<T>): Promise<T> {
  if (databaseUrl !== "") {
    globalDb.votingPool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    const client = await globalDb.votingPool.connect();
    try {
      await client.query("begin");
      const result = await fn(
        asQuery(async (text, params) => {
          const res = await client.query(text, params);
          return res.rows;
        }),
      );
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
    return fn(
      asQuery(async (text, params) => {
        const res = await tx.query(text, params);
        return res.rows;
      }),
    );
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
