import pg from "pg";
const client = new pg.Client({
  connectionString: "postgresql://postgres:Floeynin123%40@db.olrasqylcfunaoqvaxie.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});
await client.connect();
console.log("Connected");

const statements = [
  // ── 1. approved_emails table ───────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS public.approved_emails (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     email text NOT NULL UNIQUE,
     added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
     created_at timestamptz DEFAULT now()
   )`,

  `ALTER TABLE public.approved_emails ENABLE ROW LEVEL SECURITY`,

  // Authenticated users can read approved emails (for UI listing)
  `CREATE POLICY "Authenticated can read approved emails"
     ON public.approved_emails FOR SELECT
     USING (auth.uid() IS NOT NULL)`,

  // Org admins can add approved emails
  `CREATE POLICY "Org admins can insert approved emails"
     ON public.approved_emails FOR INSERT
     WITH CHECK (
       auth.uid() IN (SELECT user_id FROM public.org_members WHERE role = 'admin')
     )`,

  // Org admins can delete approved emails
  `CREATE POLICY "Org admins can delete approved emails"
     ON public.approved_emails FOR DELETE
     USING (
       auth.uid() IN (SELECT user_id FROM public.org_members WHERE role = 'admin')
     )`,

  // ── 2. org_invites table (pending invitations for unregistered users) ──
  `CREATE TABLE IF NOT EXISTS public.org_invites (
     email text NOT NULL,
     org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
     invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
     created_at timestamptz DEFAULT now(),
     PRIMARY KEY (email, org_id)
   )`,

  `ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY`,

  // Org members can see invites for their orgs
  `CREATE POLICY "Org members can read org invites"
     ON public.org_invites FOR SELECT
     USING (
       org_id IN (SELECT om.org_id FROM public.org_members om WHERE om.user_id = auth.uid())
     )`,

  // Org admins can create invites
  `CREATE POLICY "Org admins can insert invites"
     ON public.org_invites FOR INSERT
     WITH CHECK (
       org_id IN (SELECT om.org_id FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'admin')
     )`,

  // Org admins can delete invites
  `CREATE POLICY "Org admins can delete invites"
     ON public.org_invites FOR DELETE
     USING (
       org_id IN (SELECT om.org_id FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'admin')
     )`,

  // ── 3. RPC: check if email is approved (callable by anon for signup flow) ──
  `CREATE OR REPLACE FUNCTION public.is_email_approved(check_email text)
     RETURNS boolean AS $$
     BEGIN
       IF (SELECT count(*) FROM public.approved_emails) = 0 THEN
         RETURN true;
       END IF;
       RETURN EXISTS (SELECT 1 FROM public.approved_emails WHERE lower(email) = lower(check_email));
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER`,

  `GRANT EXECUTE ON FUNCTION public.is_email_approved(text) TO anon, authenticated`,

  // ── 4. RPC: lookup user by email (for admin adding members) ──
  `CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email text)
     RETURNS TABLE(user_id uuid, full_name text, email text) AS $$
     BEGIN
       RETURN QUERY SELECT p.id, p.full_name, p.email
         FROM public.profiles p
         WHERE lower(p.email) = lower(lookup_email);
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER`,

  // ── 5. Trigger: block unapproved signups ──
  `CREATE OR REPLACE FUNCTION public.check_approved_email()
     RETURNS trigger AS $$
     BEGIN
       IF (SELECT count(*) FROM public.approved_emails) = 0 THEN
         RETURN NEW;
       END IF;
       IF NOT EXISTS (SELECT 1 FROM public.approved_emails WHERE lower(email) = lower(NEW.email)) THEN
         RAISE EXCEPTION 'E-postadressen er ikke godkjent for tilgang';
       END IF;
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER`,

  `DROP TRIGGER IF EXISTS check_email_approved ON auth.users`,

  `CREATE TRIGGER check_email_approved
     BEFORE INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.check_approved_email()`,

  // ── 6. Update handle_new_user to auto-process org invites ──
  `CREATE OR REPLACE FUNCTION public.handle_new_user()
     RETURNS trigger AS $$
     BEGIN
       INSERT INTO public.profiles (id, full_name, email)
       VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);

       INSERT INTO public.approved_emails (email)
       VALUES (new.email)
       ON CONFLICT (email) DO NOTHING;

       INSERT INTO public.org_members (user_id, org_id, role)
       SELECT new.id, oi.org_id, 'member'
       FROM public.org_invites oi
       WHERE lower(oi.email) = lower(new.email);

       DELETE FROM public.org_invites WHERE lower(email) = lower(new.email);

       RETURN new;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER`,

  // ── 7. Org admins can add/remove members ──
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE policyname = 'Org admins can add members' AND tablename = 'org_members'
     ) THEN
       CREATE POLICY "Org admins can add members"
         ON public.org_members FOR INSERT
         WITH CHECK (
           org_id IN (SELECT om.org_id FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'admin')
         );
     END IF;
   END $$`,

  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE policyname = 'Org admins can remove members' AND tablename = 'org_members'
     ) THEN
       CREATE POLICY "Org admins can remove members"
         ON public.org_members FOR DELETE
         USING (
           org_id IN (SELECT om.org_id FROM public.org_members om WHERE om.user_id = auth.uid() AND om.role = 'admin')
         );
     END IF;
   END $$`,

  // ── 8. Co-members can read each other's profiles ──
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE policyname = 'Co-members can read profiles' AND tablename = 'profiles'
     ) THEN
       CREATE POLICY "Co-members can read profiles"
         ON public.profiles FOR SELECT
         USING (
           id IN (
             SELECT om2.user_id FROM public.org_members om1
             JOIN public.org_members om2 ON om1.org_id = om2.org_id
             WHERE om1.user_id = auth.uid()
           )
         );
     END IF;
   END $$`,

  // ── 9. Seed existing users into approved_emails ──
  `INSERT INTO public.approved_emails (email, added_by)
     SELECT p.email, p.id FROM public.profiles p
     ON CONFLICT (email) DO NOTHING`,
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
console.log("\nDone! Remember to disable email confirmation in Supabase Dashboard:");
console.log("  → Authentication → Providers → Email → Disable 'Confirm email'");
