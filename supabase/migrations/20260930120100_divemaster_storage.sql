-- Storage buckets for divemaster avatars/certs and dive-site card images.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'divemaster-media',
  'divemaster-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dive-site-images',
  'dive-site-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- divemaster-media: public read; owners write under their user id folder; admins full
DROP POLICY IF EXISTS "Public read divemaster media" ON storage.objects;
CREATE POLICY "Public read divemaster media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'divemaster-media');

DROP POLICY IF EXISTS "Owners insert divemaster media" ON storage.objects;
CREATE POLICY "Owners insert divemaster media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'divemaster-media'
    AND (
      public.is_app_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Owners update divemaster media" ON storage.objects;
CREATE POLICY "Owners update divemaster media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'divemaster-media'
    AND (
      public.is_app_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id = 'divemaster-media'
    AND (
      public.is_app_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Owners delete divemaster media" ON storage.objects;
CREATE POLICY "Owners delete divemaster media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'divemaster-media'
    AND (
      public.is_app_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- dive-site-images: public read; admins write
DROP POLICY IF EXISTS "Public read dive site images" ON storage.objects;
CREATE POLICY "Public read dive site images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'dive-site-images');

DROP POLICY IF EXISTS "Admins insert dive site images" ON storage.objects;
CREATE POLICY "Admins insert dive site images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dive-site-images' AND public.is_app_admin());

DROP POLICY IF EXISTS "Admins update dive site images" ON storage.objects;
CREATE POLICY "Admins update dive site images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'dive-site-images' AND public.is_app_admin())
  WITH CHECK (bucket_id = 'dive-site-images' AND public.is_app_admin());

DROP POLICY IF EXISTS "Admins delete dive site images" ON storage.objects;
CREATE POLICY "Admins delete dive site images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'dive-site-images' AND public.is_app_admin());
