import pg from "pg";

const connStr = process.argv[2];
if (!connStr) {
  console.log("Usage: node create-share-table.mjs <DATABASE_URL>");
  console.log("Find it in Supabase Dashboard → Settings → Database → Connection string (URI)");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected");

const statements = [
  `CREATE TABLE IF NOT EXISTS public.shared_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config jsonb NOT NULL,
    project_name text NOT NULL DEFAULT '',
    customer_name text NOT NULL DEFAULT '',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
  )`,
  `ALTER TABLE public.shared_configs ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shared_configs' AND policyname='Anyone can read shared configs') THEN
      CREATE POLICY "Anyone can read shared configs" ON public.shared_configs FOR SELECT USING (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shared_configs' AND policyname='Authenticated users can create shares') THEN
      CREATE POLICY "Authenticated users can create shares" ON public.shared_configs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shared_configs' AND policyname='Creator can delete own shares') THEN
      CREATE POLICY "Creator can delete own shares" ON public.shared_configs FOR DELETE USING (created_by = auth.uid());
    END IF;
  END $$`,
];

for (const sql of statements) {
  try {
    await client.query(sql);
    console.log("OK:", sql.substring(0, 60).replace(/\n/g, " "));
  } catch (e) {
    console.log("SKIP:", e.message.substring(0, 80));
  }
}

await client.end();
console.log("\nDone! shared_configs table is ready.");
