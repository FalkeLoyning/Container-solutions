// Quick script to check and create shared_configs table
const { createClient } = require("@supabase/supabase-js");
const { writeFileSync } = require("fs");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://olrasqylcfunaoqvaxie.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!key) {
  writeFileSync("check-result.txt", "NO_SERVICE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);

async function main() {
  const { data, error } = await sb.from("shared_configs").select("id").limit(1);
  
  if (error) {
    writeFileSync("check-result.txt", `ERROR: ${error.code} - ${error.message}`);
  } else {
    writeFileSync("check-result.txt", `TABLE_EXISTS (${(data||[]).length} rows)`);
  }
}

main().catch(e => writeFileSync("check-result.txt", `EXCEPTION: ${e.message}`));
