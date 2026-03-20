/**
 * Container Solutions — Oppsett
 *
 * Bruk: node setup-supabase.mjs <SUPABASE_URL> <ANON_KEY>
 *
 * Oppdaterer .env.local med ekte Supabase-nøkler og tester tilkoblingen.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const [,, url, anonKey] = process.argv;

if (!url || !anonKey) {
  console.log(`
  Bruk: node setup-supabase.mjs <SUPABASE_URL> <ANON_KEY>

  Finn disse i Supabase Dashboard → Settings → API
  `);
  process.exit(1);
}

// Update .env.local
const envContent = `# Supabase
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
`;
writeFileSync(".env.local", envContent, "utf-8");
console.log("✅ .env.local oppdatert");

// Test connection
const supabase = createClient(url, anonKey);
const { error } = await supabase.from("profiles").select("id").limit(1);
if (error && error.code === "PGRST116") {
  console.log("✅ Tilkobling OK (ingen profiler ennå, som forventet)");
} else if (error && error.message.includes("relation")) {
  console.log("⚠️  Tilkobling OK, men tabellene finnes ikke ennå.");
  console.log("   → Kjør SQL-migreringen først (supabase-migration.sql)");
} else if (error) {
  console.log("⚠️  Tilkobling feilet:", error.message);
} else {
  console.log("✅ Tilkobling og database OK");
}

console.log("\nFerdig! Kjør 'npm run dev' for å teste lokalt.");

