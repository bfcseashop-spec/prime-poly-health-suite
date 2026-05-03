
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS photo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read patient photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'patient-photos');

CREATE POLICY "Auth upload patient photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'patient-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth update patient photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'patient-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth delete patient photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'patient-photos' AND auth.uid() IS NOT NULL);
