-- Access codes for user registration
-- Admin generates a code per email, user enters it to register

CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  email text NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Admins can read all codes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='access_codes' AND policyname='Authenticated users can read access codes') THEN
    CREATE POLICY "Authenticated users can read access codes" ON public.access_codes FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Admins can create codes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='access_codes' AND policyname='Authenticated users can create access codes') THEN
    CREATE POLICY "Authenticated users can create access codes" ON public.access_codes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Admins can update (mark as used)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='access_codes' AND policyname='Authenticated users can update access codes') THEN
    CREATE POLICY "Authenticated users can update access codes" ON public.access_codes FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Admins can delete codes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='access_codes' AND policyname='Authenticated users can delete access codes') THEN
    CREATE POLICY "Authenticated users can delete access codes" ON public.access_codes FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
