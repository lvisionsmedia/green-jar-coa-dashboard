import { neon } from "@neondatabase/serverless";

let schemaReady = false;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return neon(databaseUrl);
}

export async function ensureSchema() {
  if (schemaReady) return;

  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS coas (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      blob_url TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  schemaReady = true;
}

export { getSql };
