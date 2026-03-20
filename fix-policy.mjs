import pg from "pg";
const client = new pg.Client({
  connectionString: "postgresql://postgres:Floeynin123%40@db.olrasqylcfunaoqvaxie.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query(`
  create policy "Org members can read org"
    on public.organizations for select
    using (
      id in (select org_id from public.org_members where user_id = auth.uid())
    );
`);
console.log("Policy created!");
await client.end();
