import pg from "pg";
import { readFileSync } from "node:fs";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function migrate() {
  const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  await pool.query(sql);
}

// pgvector accepts the text form "[0.1,0.2,...]"
export const toVector = (v: number[]) => `[${v.join(",")}]`;
