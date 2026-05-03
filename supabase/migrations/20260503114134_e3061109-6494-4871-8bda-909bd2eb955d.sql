
ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS box_barcode text,
  ADD COLUMN IF NOT EXISTS packet_barcode text,
  ADD COLUMN IF NOT EXISTS strip_barcode text,
  ADD COLUMN IF NOT EXISTS box_cost_usd numeric,
  ADD COLUMN IF NOT EXISTS packet_cost_usd numeric,
  ADD COLUMN IF NOT EXISTS strip_cost_usd numeric;
CREATE INDEX IF NOT EXISTS idx_medicines_box_barcode ON public.medicines(box_barcode);
CREATE INDEX IF NOT EXISTS idx_medicines_strip_barcode ON public.medicines(strip_barcode);
CREATE INDEX IF NOT EXISTS idx_medicines_packet_barcode ON public.medicines(packet_barcode);
