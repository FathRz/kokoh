import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
const vars = Object.fromEntries(
  env.split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim()];
    })
);

const url = vars["NEXT_PUBLIC_SUPABASE_URL"];
const anonKey = vars["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const serviceKey = vars["SUPABASE_SERVICE_ROLE_KEY"];

console.log("=== Kokoh - Supabase Connection Test ===\n");
console.log("URL     :", url);
console.log("Anon Key:", anonKey?.slice(0, 30) + "...");
console.log("Svc Key :", serviceKey?.slice(0, 30) + "...\n");

const anon  = createClient(url, anonKey);
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// Test 1: Service role key bypass RLS
// ============================================================
console.log("Test 1: Service role key bypass RLS...");
const { data: tenantData, error: tenantError } = await admin
  .from("tenants")
  .select("id, name, plan")
  .limit(5);

if (!tenantError) {
  console.log("  OK - Service role bypass RLS berhasil");
  console.log("  Data tenants:", tenantData.length > 0 ? JSON.stringify(tenantData) : "(kosong, normal)");
} else {
  console.log(`  FAIL - ${tenantError.message} (${tenantError.code})`);
}

// ============================================================
// Test 2: Cek semua 16 tabel dengan service role
// ============================================================
console.log("\nTest 2: Cek semua tabel (service role)...");

const TABLES = [
  "tenants", "profiles", "projects", "wbs_items",
  "daily_logs", "progress_photos", "materials", "inventory",
  "material_requests", "material_request_items",
  "purchase_orders", "purchase_order_items",
  "property_units", "consumers", "unit_bookings", "audit_logs",
];

let allOk = true;
for (const table of TABLES) {
  const { error } = await admin.from(table).select("count").limit(1);
  if (!error) {
    console.log(`  OK    ${table}`);
  } else {
    console.log(`  FAIL  ${table} — ${error.message} (${error.code})`);
    allOk = false;
  }
}

// ============================================================
// Test 3: Anon key kena RLS (harusnya forbidden)
// ============================================================
console.log("\nTest 3: Anon key kena RLS (harus ditolak)...");
const { error: anonError } = await anon.from("tenants").select("count").limit(1);
if (anonError?.code === "42501") {
  console.log("  OK - RLS aktif, anon diblokir dengan benar");
} else if (!anonError) {
  console.log("  WARN - Anon bisa akses tenants, cek RLS policy");
} else {
  console.log(`  INFO - ${anonError.message} (${anonError.code})`);
}

// ============================================================
// Test 4: Auth service
// ============================================================
console.log("\nTest 4: Auth service...");
const { data: { session } } = await anon.auth.getSession();
console.log("  OK - Auth service aktif, session:", session ? "ada" : "tidak ada (normal)");

// ============================================================
// Test 5: Storage buckets
// ============================================================
console.log("\nTest 5: Storage buckets...");
const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
if (bucketsError) {
  console.log("  FAIL -", bucketsError.message);
} else {
  const expected = ["progress-photos", "documents", "avatars"];
  for (const name of expected) {
    const found = buckets.find((b) => b.id === name);
    if (found) {
      console.log(`  OK    ${name} (${found.public ? "public" : "private"})`);
    } else {
      console.log(`  FAIL  ${name} — bucket tidak ditemukan`);
    }
  }
}

// ============================================================
// Ringkasan
// ============================================================
console.log("\n=== Ringkasan ===");
if (allOk) {
  console.log("Semua tabel dan koneksi OK. Siap untuk development!");
} else {
  console.log("Ada tabel yang bermasalah, cek migration di atas.");
}
