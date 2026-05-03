
-- Doctors: add salary + telegram + day off + leave fields + duty schedule
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS telegram_id text,
  ADD COLUMN IF NOT EXISTS monthly_salary_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS day_off text,
  ADD COLUMN IF NOT EXISTS leave_from date,
  ADD COLUMN IF NOT EXISTS leave_to date,
  ADD COLUMN IF NOT EXISTS leave_reason text,
  ADD COLUMN IF NOT EXISTS duty_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS address text;

-- Staff: add telegram + day off + leave fields + duty schedule
ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS telegram_id text,
  ADD COLUMN IF NOT EXISTS day_off text,
  ADD COLUMN IF NOT EXISTS leave_from date,
  ADD COLUMN IF NOT EXISTS leave_to date,
  ADD COLUMN IF NOT EXISTS leave_reason text,
  ADD COLUMN IF NOT EXISTS duty_schedule jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Storage bucket for staff/doctor photos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-photos', 'staff-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policies + authenticated write/update/delete
DO $$ BEGIN
  CREATE POLICY "Staff photos public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'staff-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Auth upload staff photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'staff-photos' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Auth update staff photos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'staff-photos' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Auth delete staff photos" ON storage.objects
    FOR DELETE USING (bucket_id = 'staff-photos' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
