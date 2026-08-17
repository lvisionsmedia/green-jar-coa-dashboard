import { del } from "@vercel/blob";
import type { CoaRecord } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";

type ListOptions = {
  storeId: string;
  search?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
};

type DbRow = {
  id: string;
  store_id: string;
  file_name: string;
  blob_url: string;
  file_size: number;
  uploaded_at: string;
};

function mapRow(row: DbRow): CoaRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    fileName: row.file_name,
    blobUrl: row.blob_url,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
  };
}

export async function listCoas(options: ListOptions) {
  const supabase = getSupabase();

  const search = options.search?.trim() ?? "";
  const sort = options.sort === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("coas")
    .select("id, store_id, file_name, blob_url, file_size, uploaded_at", {
      count: "exact",
    })
    .eq("store_id", options.storeId);

  if (search) {
    query = query.ilike("file_name", `%${search}%`);
  }

  const { data, count, error } = await query
    .order("uploaded_at", { ascending: sort === "oldest" })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`Failed to list COAs: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    items: ((data ?? []) as DbRow[]).map(mapRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCoa(id: string, storeId?: string) {
  const supabase = getSupabase();
  let query = supabase
    .from("coas")
    .select("id, store_id, file_name, blob_url, file_size, uploaded_at")
    .eq("id", id);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to get COA: ${error.message}`);
  }

  return data ? mapRow(data as DbRow) : null;
}

export async function createCoa(record: CoaRecord) {
  const supabase = getSupabase();
  const { error } = await supabase.from("coas").insert({
    id: record.id,
    store_id: record.storeId,
    file_name: record.fileName,
    blob_url: record.blobUrl,
    file_size: record.fileSize,
    uploaded_at: record.uploadedAt,
  });

  if (error) {
    throw new Error(`Failed to create COA: ${error.message}`);
  }
}

export async function deleteCoa(id: string, storeId: string) {
  const coa = await getCoa(id, storeId);
  if (!coa) return false;

  await del(coa.blobUrl);

  const supabase = getSupabase();
  const { error } = await supabase
    .from("coas")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) {
    throw new Error(`Failed to delete COA: ${error.message}`);
  }

  return true;
}
