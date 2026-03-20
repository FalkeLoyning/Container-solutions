import pg from "pg";
const client = new pg.Client({
  connectionString: "postgresql://postgres:Floeynin123%40@db.olrasqylcfunaoqvaxie.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});
await client.connect();
console.log("Connected");

const statements = [
  // Add owner_id column (nullable for existing rows)
  `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL`,

  // Add default for invite_code: random 6-char uppercase
  `ALTER TABLE public.organizations ALTER COLUMN invite_code SET DEFAULT upper(substr(md5(random()::text), 1, 6))`,

  // Allow org creators to read their own org immediately (before they join as member)
  `CREATE POLICY "Creator can read own org" ON public.organizations FOR SELECT USING (owner_id = auth.uid())`,

  // Allow reading orgs by invite_code for joining
  `CREATE POLICY "Anyone can read org by invite code" ON public.organizations FOR SELECT USING (auth.uid() IS NOT NULL)`,
];

for (const stmt of statements) {
  try {
    await client.query(stmt);
    console.log("OK:", stmt.substring(0, 70) + "...");
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log("SKIP (exists):", stmt.substring(0, 70) + "...");
    } else {
      console.error("FAIL:", e.message);
    }
  }
}

await client.end();
console.log("Done");
