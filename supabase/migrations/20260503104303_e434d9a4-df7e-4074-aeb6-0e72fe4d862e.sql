
-- Lab test catalog
CREATE TABLE IF NOT EXISTS public.lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sample_type text,
  unit text,
  reference_range text,
  price_usd numeric NOT NULL DEFAULT 0,
  turnaround_hours integer DEFAULT 24,
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view lab tests" ON public.lab_tests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manage lab tests" ON public.lab_tests FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'lab_tech'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'lab_tech'));
CREATE TRIGGER lab_tests_updated BEFORE UPDATE ON public.lab_tests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lab order sequence
CREATE SEQUENCE IF NOT EXISTS public.lab_order_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_lab_order_no()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RETURN 'LAB-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.lab_order_seq')::text,4,'0'); END; $$;

-- Lab orders (one per visit/request, can contain multiple tests)
CREATE TABLE IF NOT EXISTS public.lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL DEFAULT public.generate_lab_order_no(),
  patient_id uuid NOT NULL,
  visit_id uuid,
  doctor_id uuid,
  doctor_name text,
  ordered_on date NOT NULL DEFAULT CURRENT_DATE,
  priority text NOT NULL DEFAULT 'normal',  -- normal | urgent | stat
  sample_status text NOT NULL DEFAULT 'pending', -- pending | collected | received | rejected
  sample_collected_at timestamptz,
  sample_collected_by uuid,
  sample_notes text,
  status text NOT NULL DEFAULT 'pending',  -- pending | in_progress | completed | cancelled
  total_usd numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage lab orders" ON public.lab_orders FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER lab_orders_updated BEFORE UPDATE ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON public.lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON public.lab_orders(status);

-- Lab order items (individual tests with results)
CREATE TABLE IF NOT EXISTS public.lab_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  test_id uuid,
  test_name text NOT NULL,
  category text,
  sample_type text,
  price_usd numeric NOT NULL DEFAULT 0,
  result_value text,
  result_unit text,
  reference_range text,
  flag text, -- normal | low | high | critical
  result_notes text,
  result_file_url text,
  status text NOT NULL DEFAULT 'pending', -- pending | in_progress | completed
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage lab order items" ON public.lab_order_items FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_lab_order_items_order ON public.lab_order_items(order_id);

-- Storage bucket for lab files
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-files','lab-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read lab files" ON storage.objects FOR SELECT USING (bucket_id = 'lab-files');
CREATE POLICY "Staff upload lab files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lab-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "Staff update lab files" ON storage.objects FOR UPDATE
  USING (bucket_id = 'lab-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "Staff delete lab files" ON storage.objects FOR DELETE
  USING (bucket_id = 'lab-files' AND auth.uid() IS NOT NULL);

-- Seed common tests
INSERT INTO public.lab_tests (code, name, category, sample_type, unit, reference_range, price_usd) VALUES
  ('CBC', 'Complete Blood Count (CBC)', 'hematology', 'Blood (EDTA)', '', '', 8.00),
  ('FBS', 'Fasting Blood Sugar', 'biochemistry', 'Blood (Serum)', 'mg/dL', '70-100', 3.00),
  ('RBS', 'Random Blood Sugar', 'biochemistry', 'Blood (Serum)', 'mg/dL', '<140', 3.00),
  ('HBA1C', 'HbA1c', 'biochemistry', 'Blood (EDTA)', '%', '4.0-5.6', 12.00),
  ('LFT', 'Liver Function Test', 'biochemistry', 'Blood (Serum)', '', '', 15.00),
  ('KFT', 'Kidney Function Test', 'biochemistry', 'Blood (Serum)', '', '', 15.00),
  ('LIPID', 'Lipid Profile', 'biochemistry', 'Blood (Serum)', 'mg/dL', '', 14.00),
  ('TSH', 'Thyroid (TSH)', 'endocrinology', 'Blood (Serum)', 'µIU/mL', '0.4-4.0', 10.00),
  ('URINE', 'Urine Routine', 'urinalysis', 'Urine', '', '', 4.00),
  ('STOOL', 'Stool Routine', 'microbiology', 'Stool', '', '', 4.00),
  ('DENGUE', 'Dengue NS1', 'serology', 'Blood (Serum)', '', 'Negative', 12.00),
  ('TYPHI', 'Widal Test', 'serology', 'Blood (Serum)', '', 'Negative', 6.00),
  ('HIV', 'HIV Screening', 'serology', 'Blood (Serum)', '', 'Non-reactive', 10.00),
  ('HBSAG', 'HBsAg', 'serology', 'Blood (Serum)', '', 'Non-reactive', 8.00),
  ('PT_INR', 'PT / INR', 'hematology', 'Blood (Citrate)', '', '', 9.00)
ON CONFLICT (code) DO NOTHING;
