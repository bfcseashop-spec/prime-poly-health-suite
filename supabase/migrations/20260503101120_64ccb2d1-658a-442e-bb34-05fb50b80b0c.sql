CREATE TABLE IF NOT EXISTS public.patient_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  file_url text NOT NULL,
  storage_path text NOT NULL,
  caption text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view patient photos" ON public.patient_photos
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff add patient photos" ON public.patient_photos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update patient photos" ON public.patient_photos
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff delete patient photos" ON public.patient_photos
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_patient_photos_patient ON public.patient_photos(patient_id);