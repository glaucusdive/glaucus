-- Blog posts for public /blog and admin CMS.

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  hero_image_url TEXT NOT NULL DEFAULT '',
  hero_image_alt TEXT NOT NULL DEFAULT '',
  body_markdown TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_sort
  ON blog_posts (status, sort_order DESC, published_at DESC NULLS LAST);

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE blog_posts IS 'Evergreen dive blog posts; public read when status=published.';

-- Auto slug from title when slug omitted (reuses public.slugify from diveshops migration).
CREATE OR REPLACE FUNCTION public.blog_posts_set_slug_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND trim(NEW.slug) <> '' THEN
    NEW.slug := trim(both '-' from lower(regexp_replace(trim(NEW.slug), '[^a-zA-Z0-9-]+', '-', 'g')));
    IF NEW.slug = '' THEN
      NEW.slug := NULL;
    END IF;
  END IF;

  IF NEW.slug IS NOT NULL AND trim(NEW.slug) <> '' THEN
    RETURN NEW;
  END IF;

  base := coalesce(public.slugify(NEW.title), 'post');
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM blog_posts p WHERE p.slug = candidate AND p.id IS DISTINCT FROM NEW.id
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_set_slug ON blog_posts;
CREATE TRIGGER trg_blog_posts_set_slug
  BEFORE INSERT OR UPDATE OF slug, title ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.blog_posts_set_slug_on_insert();

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published blog posts" ON blog_posts;
CREATE POLICY "Public read published blog posts"
  ON blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins manage blog posts" ON blog_posts;
CREATE POLICY "Admins manage blog posts"
  ON blog_posts
  FOR ALL
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- Seed five draft posts from landing FPO content.
INSERT INTO blog_posts (slug, title, excerpt, hero_image_url, hero_image_alt, sort_order, status)
VALUES
  (
    'choosing-right-dive-course',
    'Choosing the right dive course',
    'Match your goals, conditions, and schedule to an agency path—from discover scuba through advanced specialties.',
    '/images/landing/glaucus-blog-fpo-1.jpg',
    'Diver reviewing course options next to open water',
    5,
    'draft'
  ),
  (
    'preparing-for-your-first-dive',
    'Preparing for your first dive',
    'Paperwork, fitness and comfort in the water, what to pack, and how pool or confined water sets you up for success.',
    '/images/landing/glaucus-blog-fpo-2.jpg',
    'Student diver preparing gear before a pool session',
    4,
    'draft'
  ),
  (
    'how-to-obtain-your-first-dive-certification',
    'How to obtain your first dive certification',
    'Learn what it takes to earn your first certification so you can move confidently from class to open water dives.',
    '/images/landing/glaucus-blog-fpo-1.jpg',
    'Open water certification celebration at the surface',
    3,
    'draft'
  ),
  (
    'understanding-rental-gear-vs-buying-your-own',
    'Understanding rental gear vs buying your own',
    'When rentals make sense, what fit and hygiene matter for beginners, and sensible first purchases after certification.',
    '/images/landing/glaucus-blog-fpo-2.jpg',
    'Rental BCD and regulator laid out for a dive trip',
    2,
    'draft'
  ),
  (
    'planning-your-first-dive-trip',
    'Planning your first dive trip',
    'Pick a destination and season, shortlist shops, align flights and insurance, and build a simple itinerary that stays flexible.',
    '/images/landing/glaucus-blog-fpo-1.jpg',
    'Map and passport next to a dive log on a wooden table',
    1,
    'draft'
  )
ON CONFLICT (slug) DO NOTHING;
