import { createClient } from "@supabase/supabase-js";

function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.greencoa_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.greencoa_SUPABASE_SECRET_KEY
  );
}

export function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = getServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard → Settings → API).",
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
