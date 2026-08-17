import { getSupabase } from "@/lib/supabase";
import type { StoreRecord, StoreUserRecord } from "@/lib/types";

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

type StoreUserRow = {
  id: string;
  store_id: string;
  email: string;
  password_hash: string;
  created_at: string;
};

function mapStore(row: StoreRow): StoreRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    createdAt: row.created_at,
  };
}

function mapStoreUser(row: StoreUserRow): StoreUserRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

export async function listStores(): Promise<StoreRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug, name, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list stores: ${error.message}`);
  }

  return ((data ?? []) as StoreRow[]).map(mapStore);
}

export async function getStoreBySlug(
  slug: string,
): Promise<StoreRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug, name, created_at")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get store: ${error.message}`);
  }

  return data ? mapStore(data as StoreRow) : null;
}

export async function getStoreById(id: string): Promise<StoreRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug, name, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get store: ${error.message}`);
  }

  return data ? mapStore(data as StoreRow) : null;
}

export async function getStoreUserByEmail(
  storeId: string,
  email: string,
): Promise<StoreUserRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("store_users")
    .select("id, store_id, email, password_hash, created_at")
    .eq("store_id", storeId)
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get store user: ${error.message}`);
  }

  return data ? mapStoreUser(data as StoreUserRow) : null;
}
