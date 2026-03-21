import pg from "pg";
const client = new pg.Client({
  connectionString: "postgresql://postgres:Floeynin123%40@db.olrasqylcfunaoqvaxie.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});
await client.connect();
console.log("Connected");

const statements = [
  // ── Helper functions (SECURITY DEFINER = bypasses RLS) ──
  `CREATE OR REPLACE FUNCTION public.get_my_org_ids()
   RETURNS SETOF uuid AS $$
     SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
   $$ LANGUAGE sql SECURITY DEFINER STABLE`,

  `CREATE OR REPLACE FUNCTION public.get_my_admin_org_ids()
   RETURNS SETOF uuid AS $$
     SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'admin'
   $$ LANGUAGE sql SECURITY DEFINER STABLE`,

  // ── Drop all recursive policies on org_members ──
  `DROP POLICY IF EXISTS "Users can see co-members in their orgs" ON public.org_members`,
  `DROP POLICY IF EXISTS "Org admins can add members" ON public.org_members`,
  `DROP POLICY IF EXISTS "Org admins can remove members" ON public.org_members`,

  // ── Recreate without recursion ──
  `CREATE POLICY "Users can see co-members in their orgs"
     ON public.org_members FOR SELECT
     USING (org_id IN (SELECT public.get_my_org_ids()))`,

  `CREATE POLICY "Org admins can add members"
     ON public.org_members FOR INSERT
     WITH CHECK (org_id IN (SELECT public.get_my_admin_org_ids()))`,

  `CREATE POLICY "Org admins can remove members"
     ON public.org_members FOR DELETE
     USING (org_id IN (SELECT public.get_my_admin_org_ids()))`,

  // ── Fix same pattern on organizations table ──
  `DROP POLICY IF EXISTS "Org members can read org" ON public.organizations`,

  `CREATE POLICY "Org members can read org"
     ON public.organizations FOR SELECT
     USING (id IN (SELECT public.get_my_org_ids()))`,

  // ── Fix same pattern on projects table ──
  `DROP POLICY IF EXISTS "Org members can read org projects" ON public.projects`,
  `DROP POLICY IF EXISTS "Org members can update org projects" ON public.projects`,

  `CREATE POLICY "Org members can read org projects"
     ON public.projects FOR SELECT
     USING (org_id IS NOT NULL AND org_id IN (SELECT public.get_my_org_ids()))`,

  `CREATE POLICY "Org members can update org projects"
     ON public.projects FOR UPDATE
     USING (org_id IS NOT NULL AND org_id IN (SELECT public.get_my_org_ids()))`,

  // ── Fix same pattern on step_library table ──
  `DROP POLICY IF EXISTS "Org members can read org files" ON public.step_library`,

  `CREATE POLICY "Org members can read org files"
     ON public.step_library FOR SELECT
     USING (org_id IS NOT NULL AND org_id IN (SELECT public.get_my_org_ids()))`,

  // ── Fix same pattern on org_invites table ──
  `DROP POLICY IF EXISTS "Org members can read org invites" ON public.org_invites`,
  `DROP POLICY IF EXISTS "Org admins can insert invites" ON public.org_invites`,
  `DROP POLICY IF EXISTS "Org admins can delete invites" ON public.org_invites`,

  `CREATE POLICY "Org members can read org invites"
     ON public.org_invites FOR SELECT
     USING (org_id IN (SELECT public.get_my_org_ids()))`,

  `CREATE POLICY "Org admins can insert invites"
     ON public.org_invites FOR INSERT
     WITH CHECK (org_id IN (SELECT public.get_my_admin_org_ids()))`,

  `CREATE POLICY "Org admins can delete invites"
     ON public.org_invites FOR DELETE
     USING (org_id IN (SELECT public.get_my_admin_org_ids()))`,

  // ── Fix approved_emails policies ──
  `DROP POLICY IF EXISTS "Org admins can insert approved emails" ON public.approved_emails`,
  `DROP POLICY IF EXISTS "Org admins can delete approved emails" ON public.approved_emails`,

  `CREATE POLICY "Org admins can insert approved emails"
     ON public.approved_emails FOR INSERT
     WITH CHECK ((SELECT count(*) FROM public.get_my_admin_org_ids()) > 0)`,

  `CREATE POLICY "Org admins can delete approved emails"
     ON public.approved_emails FOR DELETE
     USING ((SELECT count(*) FROM public.get_my_admin_org_ids()) > 0)`,
];

for (const sql of statements) {
  try {
    await client.query(sql);
    console.log("OK:", sql.substring(0, 70).replace(/\n/g, " ").trim() + "...");
  } catch (err) {
    console.error("FAIL:", sql.substring(0, 70).replace(/\n/g, " ").trim() + "...", "\n  →", err.message);
  }
}

await client.end();
console.log("\nDone — all recursive policies replaced with SECURITY DEFINER function calls.");
