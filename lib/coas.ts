import { del } from "@vercel/blob";
import type { CoaRecord } from "@/lib/types";
import { ensureSchema, getSql } from "@/lib/db";

type ListOptions = {
  search?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
};

type DbRow = {
  id: string;
  file_name: string;
  blob_url: string;
  file_size: number;
  uploaded_at: string;
};

function mapRow(row: DbRow): CoaRecord {
  return {
    id: row.id,
    fileName: row.file_name,
    blobUrl: row.blob_url,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
  };
}

export async function listCoas(options: ListOptions = {}) {
  await ensureSchema();
  const sql = getSql();

  const search = options.search?.trim().toLowerCase() ?? "";
  const sort = options.sort === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 10));
  const offset = (page - 1) * pageSize;
  const searchPattern = search ? `%${search}%` : null;

  const rows =
    searchPattern && sort === "oldest"
      ? await sql`
          SELECT id, file_name, blob_url, file_size, uploaded_at
          FROM coas
          WHERE LOWER(file_name) LIKE ${searchPattern}
          ORDER BY uploaded_at ASC
          LIMIT ${pageSize}
          OFFSET ${offset}
        `
      : searchPattern
        ? await sql`
            SELECT id, file_name, blob_url, file_size, uploaded_at
            FROM coas
            WHERE LOWER(file_name) LIKE ${searchPattern}
            ORDER BY uploaded_at DESC
            LIMIT ${pageSize}
            OFFSET ${offset}
          `
        : sort === "oldest"
          ? await sql`
              SELECT id, file_name, blob_url, file_size, uploaded_at
              FROM coas
              ORDER BY uploaded_at ASC
              LIMIT ${pageSize}
              OFFSET ${offset}
            `
          : await sql`
              SELECT id, file_name, blob_url, file_size, uploaded_at
              FROM coas
              ORDER BY uploaded_at DESC
              LIMIT ${pageSize}
              OFFSET ${offset}
            `;

  const countRows = searchPattern
    ? await sql`
        SELECT COUNT(*)::int AS total
        FROM coas
        WHERE LOWER(file_name) LIKE ${searchPattern}
      `
    : await sql`SELECT COUNT(*)::int AS total FROM coas`;

  const total = countRows[0]?.total ?? 0;

  return {
    items: (rows as DbRow[]).map(mapRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCoa(id: string) {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, file_name, blob_url, file_size, uploaded_at
    FROM coas
    WHERE id = ${id}
    LIMIT 1
  `;

  const row = rows[0] as DbRow | undefined;
  return row ? mapRow(row) : null;
}

export async function createCoa(record: CoaRecord) {
  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO coas (id, file_name, blob_url, file_size, uploaded_at)
    VALUES (
      ${record.id},
      ${record.fileName},
      ${record.blobUrl},
      ${record.fileSize},
      ${record.uploadedAt}
    )
  `;
}

export async function deleteCoa(id: string) {
  const coa = await getCoa(id);
  if (!coa) return false;

  await del(coa.blobUrl);

  const sql = getSql();
  await sql`DELETE FROM coas WHERE id = ${id}`;
  return true;
}
