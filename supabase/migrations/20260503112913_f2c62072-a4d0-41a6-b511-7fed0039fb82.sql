ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS cost_price_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS box_price_usd numeric,
  ADD COLUMN IF NOT EXISTS packet_price_usd numeric,
  ADD COLUMN IF NOT EXISTS strip_price_usd numeric,
  ADD COLUMN IF NOT EXISTS units_per_box integer,
  ADD COLUMN IF NOT EXISTS units_per_packet integer,
  ADD COLUMN IF NOT EXISTS units_per_strip integer,
  ADD COLUMN IF NOT EXISTS generic_name text,
  ADD COLUMN IF NOT EXISTS supplier text;

CREATE TABLE IF NOT EXISTS public.medicine_stock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid NOT NULL,
  change_type text NOT NULL,
  quantity_change integer NOT NULL,
  stock_before integer NOT NULL,
  stock_after integer NOT NULL,
  cost_price_usd numeric,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medicine_stock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy manage stock history" ON public.medicine_stock_history
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'pharmacist'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'pharmacist'));

CREATE POLICY "Staff view stock history" ON public.medicine_stock_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_med_stock_history_med ON public.medicine_stock_history(medicine_id, created_at DESC);