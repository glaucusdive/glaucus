-- Public blog-media storage bucket for hero and inline images.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-media',
  'blog-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read blog media" ON storage.objects;
CREATE POLICY "Public read blog media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'blog-media');

DROP POLICY IF EXISTS "Admins insert blog media" ON storage.objects;
CREATE POLICY "Admins insert blog media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-media' AND public.is_app_admin());

DROP POLICY IF EXISTS "Admins update blog media" ON storage.objects;
CREATE POLICY "Admins update blog media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'blog-media' AND public.is_app_admin())
  WITH CHECK (bucket_id = 'blog-media' AND public.is_app_admin());

DROP POLICY IF EXISTS "Admins delete blog media" ON storage.objects;
CREATE POLICY "Admins delete blog media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog-media' AND public.is_app_admin());
