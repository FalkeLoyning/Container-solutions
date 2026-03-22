import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import dns from "dns";
import { NextResponse } from "next/server";

// This endpoint runs on Vercel (which has IPv6) and can connect directly to Supabase DB
export async function POST(request) {
  const { secret } = await request.json();
  
  // Simple secret check
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connStr = `postgresql://postgres:${process.env.DB_PASSWORD}@db.${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://","").replace(".supabase.co","")}.supabase.co:5432/postgres`;

  const client = new pg.Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    
    const sql = `
    CREATE TABLE IF NOT EXISTS public.shared_configs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      config jsonb NOT NULL,
      project_name text NOT NULL DEFAULT '',
      customer_name text NOT NULL DEFAULT '',
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.shared_configs ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shared_configs' AND policyname='Anyone can read shared configs') THEN
        CREATE POLICY "Anyone can read shared configs" ON public.shared_configs FOR SELECT USING (true);
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shared_configs' AND policyname='Authenticated users can create shares') THEN
        CREATE POLICY "Authenticated users can create shares" ON public.shared_configs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shared_configs' AND policyname='Creator can delete own shares') THEN
        CREATE POLICY "Creator can delete own shares" ON public.shared_configs FOR DELETE USING (created_by = auth.uid());
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS public.password_reset_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
      handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      handled_at timestamptz,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='password_reset_requests' AND policyname='Anyone can request password reset') THEN
        CREATE POLICY "Anyone can request password reset" ON public.password_reset_requests FOR INSERT WITH CHECK (true);
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='password_reset_requests' AND policyname='Authenticated users can read reset requests') THEN
        CREATE POLICY "Authenticated users can read reset requests" ON public.password_reset_requests FOR SELECT USING (auth.uid() IS NOT NULL);
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='password_reset_requests' AND policyname='Authenticated users can update reset requests') THEN
        CREATE POLICY "Authenticated users can update reset requests" ON public.password_reset_requests FOR UPDATE USING (auth.uid() IS NOT NULL);
      END IF;
    END $$;
    `;

    await client.query(sql);

    const { rows } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );

    await client.end();
    return NextResponse.json({ success: true, tables: rows.map(r => r.table_name) });
  } catch (err) {
    try { await client.end(); } catch {}
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
