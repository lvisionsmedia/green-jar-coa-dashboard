import { getSupabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/passwords";
import { isValidStoreSlug } from "@/lib/tenant";
import {
  getStoreById,
  getStoreBySlug,
  getStoreUserByEmail,
} from "@/lib/stores";
import type { StoreRecord } from "@/lib/types";

export type CreateStoreInput = {
  name: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
};

export async function createStoreWithAdmin(
  input: CreateStoreInput,
): Promise<StoreRecord> {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const adminPassword = input.adminPassword;

  if (!name) {
    throw new Error("Store name is required.");
  }

  if (!isValidStoreSlug(slug)) {
    throw new Error(
      "Slug must be lowercase letters, numbers, and hyphens (e.g. green-jar).",
    );
  }

  if (!adminEmail || !adminEmail.includes("@")) {
    throw new Error("A valid admin email is required.");
  }

  if (!adminPassword || adminPassword.length < 8) {
    throw new Error("Admin password must be at least 8 characters.");
  }

  const existing = await getStoreBySlug(slug);
  if (existing) {
    throw new Error(`Store slug "${slug}" is already taken.`);
  }

  const supabase = getSupabase();
  const storeId = `store_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const userId = `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const passwordHash = await hashPassword(adminPassword);

  const { error: storeError } = await supabase.from("stores").insert({
    id: storeId,
    slug,
    name,
  });

  if (storeError) {
    throw new Error(`Failed to create store: ${storeError.message}`);
  }

  const { error: userError } = await supabase.from("store_users").insert({
    id: userId,
    store_id: storeId,
    email: adminEmail,
    password_hash: passwordHash,
  });

  if (userError) {
    await supabase.from("stores").delete().eq("id", storeId);
    throw new Error(`Failed to create store admin: ${userError.message}`);
  }

  const store = await getStoreById(storeId);
  if (!store) {
    throw new Error("Store was created but could not be loaded.");
  }

  return store;
}

export async function ensureGreenJarStoreAdmin(
  email: string,
  password: string,
): Promise<void> {
  const store = await getStoreBySlug("green-jar");
  if (!store) {
    throw new Error('Seeded store "green-jar" is missing. Run migration 002.');
  }

  const existing = await getStoreUserByEmail(store.id, email);
  if (existing) {
    return;
  }

  const supabase = getSupabase();
  const passwordHash = await hashPassword(password);
  const { error } = await supabase.from("store_users").insert({
    id: `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    store_id: store.id,
    email: email.toLowerCase(),
    password_hash: passwordHash,
  });

  if (error) {
    throw new Error(`Failed to seed Green Jar admin: ${error.message}`);
  }
}
