
-- Medical records
CREATE TABLE public.medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  visit_id uuid,
  doctor_id uuid,
  doctor_name text,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint text,
  symptoms text,
  examination text,
  diagnosis text,
  treatment_plan text,
  advice text,
  follow_up_date date,
  attachments text[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_medical_records_patient ON public.medical_records(patient_id, record_date DESC);
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view medical records" ON public.medical_records FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff create medical records" ON public.medical_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update medical records" ON public.medical_records FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete medical records" ON public.medical_records FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_medical_records_updated BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lab reports
CREATE TABLE public.lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  visit_id uuid,
  test_name text NOT NULL,
  test_type text,
  test_date date NOT NULL DEFAULT CURRENT_DATE,
  report_date date,
  lab_name text,
  results text,
  reference_range text,
  status text NOT NULL DEFAULT 'pending',
  file_url text,
  notes text,
  ordered_by uuid,
  ordered_by_name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lab_reports_patient ON public.lab_reports(patient_id, test_date DESC);
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view lab reports" ON public.lab_reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff create lab reports" ON public.lab_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update lab reports" ON public.lab_reports FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete lab reports" ON public.lab_reports FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_lab_reports_updated BEFORE UPDATE ON public.lab_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for lab report files
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-reports', 'lab-reports', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lab reports public read" ON storage.objects FOR SELECT USING (bucket_id = 'lab-reports');
CREATE POLICY "Staff upload lab reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lab-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Staff update lab reports" ON storage.objects FOR UPDATE USING (bucket_id = 'lab-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete lab reports" ON storage.objects FOR DELETE USING (bucket_id = 'lab-reports' AND has_role(auth.uid(), 'admin'::app_role));
