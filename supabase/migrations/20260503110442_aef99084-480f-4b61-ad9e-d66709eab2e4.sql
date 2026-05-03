
CREATE SEQUENCE IF NOT EXISTS public.xray_order_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_xray_order_no()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RETURN 'XR-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.xray_order_seq')::text,4,'0'); END; $$;

CREATE TABLE IF NOT EXISTS public.xray_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  name text NOT NULL,
  modality text NOT NULL DEFAULT 'X-Ray',
  body_part text,
  view_type text,
  price_usd numeric NOT NULL DEFAULT 0,
  turnaround_hours integer DEFAULT 4,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.xray_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff view xray tests" ON public.xray_tests;
CREATE POLICY "Staff view xray tests" ON public.xray_tests FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admin manage xray tests" ON public.xray_tests;
CREATE POLICY "Admin manage xray tests" ON public.xray_tests FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'lab_tech'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'lab_tech'));
DROP TRIGGER IF EXISTS trg_xray_tests_updated ON public.xray_tests;
CREATE TRIGGER trg_xray_tests_updated BEFORE UPDATE ON public.xray_tests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.xray_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL DEFAULT generate_xray_order_no(),
  patient_id uuid NOT NULL,
  visit_id uuid,
  doctor_id uuid,
  doctor_name text,
  ordered_on date NOT NULL DEFAULT CURRENT_DATE,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  clinical_notes text,
  total_usd numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.xray_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage xray orders" ON public.xray_orders;
CREATE POLICY "Staff manage xray orders" ON public.xray_orders FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP TRIGGER IF EXISTS trg_xray_orders_updated ON public.xray_orders;
CREATE TRIGGER trg_xray_orders_updated BEFORE UPDATE ON public.xray_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.xray_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  test_id uuid,
  test_name text NOT NULL,
  modality text,
  body_part text,
  price_usd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  findings text,
  impression text,
  radiologist_name text,
  report_file_url text,
  image_urls text[] DEFAULT '{}',
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.xray_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage xray items" ON public.xray_order_items;
CREATE POLICY "Staff manage xray items" ON public.xray_order_items FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO storage.buckets (id, name, public) VALUES ('xray-files','xray-files',true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public view xray files" ON storage.objects;
CREATE POLICY "Public view xray files" ON storage.objects FOR SELECT USING (bucket_id='xray-files');
DROP POLICY IF EXISTS "Staff upload xray files" ON storage.objects;
CREATE POLICY "Staff upload xray files" ON storage.objects FOR INSERT WITH CHECK (bucket_id='xray-files' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Staff update xray files" ON storage.objects;
CREATE POLICY "Staff update xray files" ON storage.objects FOR UPDATE USING (bucket_id='xray-files' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Staff delete xray files" ON storage.objects;
CREATE POLICY "Staff delete xray files" ON storage.objects FOR DELETE USING (bucket_id='xray-files' AND auth.uid() IS NOT NULL);
