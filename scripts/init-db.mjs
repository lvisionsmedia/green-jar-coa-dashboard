import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.greencoa_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.greencoa_SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error(
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  console.error(
    "Get the service role key from Supabase Dashboard → Settings → API → service_role.",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { error } = await supabase.from("coas").select("id").limit(1);

if (error) {
  console.error(`The "coas" table is not ready: ${error.message}`);
  console.error(
    "Open the Supabase Dashboard -> SQL Editor and run the contents of supabase/migrations/001_coas.sql",
  );
  process.exit(1);
}

console.log('Supabase is configured and the "coas" table is ready.');
