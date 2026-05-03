ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public) VALUES ('medicine-images', 'medicine-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Medicine images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'medicine-images');

CREATE POLICY "Authenticated can upload medicine images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medicine-images');

CREATE POLICY "Authenticated can update medicine images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'medicine-images');

CREATE POLICY "Authenticated can delete medicine images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'medicine-images');