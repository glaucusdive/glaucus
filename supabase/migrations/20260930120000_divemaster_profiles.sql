-- Divemaster profiles: username, role=divemaster, profile tables, dive site images, storage.

-- ---------------------------------------------------------------------------
-- 1. profiles.username + role includes divemaster
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (
    username IS NULL
    OR (
      char_length(username) BETWEEN 3 AND 32
      AND username ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uidx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

COMMENT ON COLUMN public.profiles.username IS
  'Public URL slug for /divemaster/[username]. Lowercase letters, digits, hyphens; 3–32 chars.';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('standard', 'divemaster', 'admin'));

COMMENT ON COLUMN public.profiles.role IS
  'App role: standard | divemaster | admin. Only admins / service_role / dashboard can change role.';

-- ---------------------------------------------------------------------------
-- 2. dive_sites.image_url
-- ---------------------------------------------------------------------------
ALTER TABLE public.dive_sites
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.dive_sites.image_url IS
  'Optional primary card image URL (Supabase storage or external).';

-- ---------------------------------------------------------------------------
-- 3. divemaster_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.divemaster_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline TEXT,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  students_by_cert JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'published')),
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_divemaster_profiles_updated_at ON public.divemaster_profiles;
CREATE TRIGGER update_divemaster_profiles_updated_at
  BEFORE UPDATE ON public.divemaster_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_divemaster_profiles_status
  ON public.divemaster_profiles (status);

COMMENT ON TABLE public.divemaster_profiles IS
  'Divemaster public-profile fields. status draft|pending_review|published; role flips to divemaster on admin approve.';

ALTER TABLE public.divemaster_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read own divemaster profile" ON public.divemaster_profiles;
CREATE POLICY "Owners read own divemaster profile"
  ON public.divemaster_profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_app_admin());

DROP POLICY IF EXISTS "Public read published divemaster profile" ON public.divemaster_profiles;
CREATE POLICY "Public read published divemaster profile"
  ON public.divemaster_profiles FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Owners insert own divemaster profile" ON public.divemaster_profiles;
CREATE POLICY "Owners insert own divemaster profile"
  ON public.divemaster_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_app_admin());

DROP POLICY IF EXISTS "Owners update own draft divemaster profile" ON public.divemaster_profiles;
CREATE POLICY "Owners update own draft divemaster profile"
  ON public.divemaster_profiles FOR UPDATE
  USING (
    public.is_app_admin()
    OR (auth.uid() = user_id AND status IN ('draft', 'pending_review'))
  )
  WITH CHECK (
    public.is_app_admin()
    OR (auth.uid() = user_id AND status IN ('draft', 'pending_review'))
  );

DROP POLICY IF EXISTS "Admins delete divemaster profiles" ON public.divemaster_profiles;
CREATE POLICY "Admins delete divemaster profiles"
  ON public.divemaster_profiles FOR DELETE
  USING (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- 4. divemaster_certifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.divemaster_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.divemaster_profiles(user_id) ON DELETE CASCADE,
  agency TEXT,
  name TEXT NOT NULL,
  cert_number TEXT,
  issued_at DATE,
  expires_at DATE,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_divemaster_certifications_updated_at ON public.divemaster_certifications;
CREATE TRIGGER update_divemaster_certifications_updated_at
  BEFORE UPDATE ON public.divemaster_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_divemaster_certifications_user_id
  ON public.divemaster_certifications (user_id);

ALTER TABLE public.divemaster_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own certifications" ON public.divemaster_certifications;
CREATE POLICY "Owners manage own certifications"
  ON public.divemaster_certifications FOR ALL
  USING (auth.uid() = user_id OR public.is_app_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_app_admin());

DROP POLICY IF EXISTS "Public read published certifications" ON public.divemaster_certifications;
CREATE POLICY "Public read published certifications"
  ON public.divemaster_certifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.divemaster_profiles dm
      WHERE dm.user_id = divemaster_certifications.user_id
        AND dm.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- 5. divemaster_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.divemaster_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.divemaster_profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  diveshop_id UUID REFERENCES public.diveshops(id) ON DELETE SET NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_divemaster_jobs_updated_at ON public.divemaster_jobs;
CREATE TRIGGER update_divemaster_jobs_updated_at
  BEFORE UPDATE ON public.divemaster_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_divemaster_jobs_user_id
  ON public.divemaster_jobs (user_id);

ALTER TABLE public.divemaster_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own jobs" ON public.divemaster_jobs;
CREATE POLICY "Owners manage own jobs"
  ON public.divemaster_jobs FOR ALL
  USING (auth.uid() = user_id OR public.is_app_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_app_admin());

DROP POLICY IF EXISTS "Public read published jobs" ON public.divemaster_jobs;
CREATE POLICY "Public read published jobs"
  ON public.divemaster_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.divemaster_profiles dm
      WHERE dm.user_id = divemaster_jobs.user_id
        AND dm.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- 6. divemaster_dive_sites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.divemaster_dive_sites (
  user_id UUID NOT NULL REFERENCES public.divemaster_profiles(user_id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES public.dive_sites(id) ON DELETE CASCADE,
  note TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, dive_site_id)
);

CREATE INDEX IF NOT EXISTS idx_divemaster_dive_sites_dive_site_id
  ON public.divemaster_dive_sites (dive_site_id);

ALTER TABLE public.divemaster_dive_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own dive sites" ON public.divemaster_dive_sites;
CREATE POLICY "Owners manage own dive sites"
  ON public.divemaster_dive_sites FOR ALL
  USING (auth.uid() = user_id OR public.is_app_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_app_admin());

DROP POLICY IF EXISTS "Public read published dive site links" ON public.divemaster_dive_sites;
CREATE POLICY "Public read published dive site links"
  ON public.divemaster_dive_sites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.divemaster_profiles dm
      WHERE dm.user_id = divemaster_dive_sites.user_id
        AND dm.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- Fix: profiles public policy references divemaster_profiles — recreate after table exists
-- (If first CREATE POLICY failed because table order, re-apply here is idempotent.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can read published divemaster profiles" ON public.profiles;
CREATE POLICY "Public can read published divemaster profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.divemaster_profiles dm
      WHERE dm.user_id = profiles.id
        AND dm.status = 'published'
    )
  );
