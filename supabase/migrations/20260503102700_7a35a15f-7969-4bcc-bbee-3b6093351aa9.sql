
-- Generalize medicine_sale_items to support non-medicine billing
ALTER TABLE public.medicine_sale_items ALTER COLUMN medicine_id DROP NOT NULL;
ALTER TABLE public.medicine_sale_items ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'medicine';
ALTER TABLE public.medicine_sale_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.medicine_sale_items ADD COLUMN IF NOT EXISTS ref_id uuid;

-- Add billing/due tracking to sales
ALTER TABLE public.medicine_sales ADD COLUMN IF NOT EXISTS amount_paid_usd numeric NOT NULL DEFAULT 0;
ALTER TABLE public.medicine_sales ADD COLUMN IF NOT EXISTS due_usd numeric NOT NULL DEFAULT 0;
ALTER TABLE public.medicine_sales ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid';
ALTER TABLE public.medicine_sales ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.medicine_sales ADD COLUMN IF NOT EXISTS sale_type text NOT NULL DEFAULT 'pos';
ALTER TABLE public.medicine_sales ADD COLUMN IF NOT EXISTS insurance_card_id uuid;
ALTER TABLE public.medicine_sales ADD COLUMN IF NOT EXISTS insurance_discount_usd numeric NOT NULL DEFAULT 0;

-- Payment history (split + due payoffs)
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  amount_usd numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  reference text,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage invoice payments" ON public.invoice_payments
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_sale ON public.invoice_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_medicine_sales_status ON public.medicine_sales(status);

-- Service / fee catalog (consultation, x-ray, lab tests, services)
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'service',
  price_usd numeric NOT NULL DEFAULT 0,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view services" ON public.service_catalog
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manage services" ON public.service_catalog
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_service_catalog_updated BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed common services
INSERT INTO public.service_catalog (name, category, price_usd) VALUES
  ('General Consultation', 'consultation', 10),
  ('Specialist Consultation', 'consultation', 25),
  ('Follow-up Visit', 'consultation', 5),
  ('Chest X-Ray', 'xray', 15),
  ('Abdominal X-Ray', 'xray', 18),
  ('Dental X-Ray', 'xray', 12),
  ('Complete Blood Count (CBC)', 'lab', 8),
  ('Blood Sugar Test', 'lab', 5),
  ('Urine Analysis', 'lab', 6),
  ('Lipid Profile', 'lab', 15),
  ('Liver Function Test', 'lab', 18),
  ('Dressing', 'service', 5),
  ('Injection', 'service', 3),
  ('Nebulization', 'service', 4)
ON CONFLICT DO NOTHING;
