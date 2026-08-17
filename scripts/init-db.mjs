import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

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

const { error: coasError } = await supabase.from("coas").select("id").limit(1);

if (coasError) {
  console.error(`The "coas" table is not ready: ${coasError.message}`);
  console.error(
    "Open the Supabase Dashboard -> SQL Editor and run supabase/migrations/001_coas.sql then 002_stores.sql",
  );
  process.exit(1);
}

const { error: storesError } = await supabase
  .from("stores")
  .select("id")
  .limit(1);

if (storesError) {
  console.error(`The "stores" table is not ready: ${storesError.message}`);
  console.error(
    "Open the Supabase Dashboard -> SQL Editor and run supabase/migrations/002_stores.sql",
  );
  process.exit(1);
}

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (adminEmail && adminPassword) {
  const { data: store, error: storeLookupError } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", "green-jar")
    .maybeSingle();

  if (storeLookupError || !store) {
    console.error(
      'Seeded store "green-jar" is missing. Run supabase/migrations/002_stores.sql',
    );
    process.exit(1);
  }

  const { data: existingUser, error: userLookupError } = await supabase
    .from("store_users")
    .select("id")
    .eq("store_id", store.id)
    .eq("email", adminEmail)
    .maybeSingle();

  if (userLookupError) {
    console.error(`Failed to check store users: ${userLookupError.message}`);
    process.exit(1);
  }

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const { error: insertError } = await supabase.from("store_users").insert({
      id: `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      store_id: store.id,
      email: adminEmail,
      password_hash: passwordHash,
    });

    if (insertError) {
      console.error(`Failed to seed Green Jar admin: ${insertError.message}`);
      process.exit(1);
    }

    console.log(`Seeded Green Jar store admin for ${adminEmail}.`);
  } else {
    console.log(`Green Jar store admin already exists for ${adminEmail}.`);
  }
} else {
  console.warn(
    "ADMIN_EMAIL / ADMIN_PASSWORD not set; skipped Green Jar store admin seed.",
  );
}

console.log('Supabase is configured and multi-tenant tables are ready.');
