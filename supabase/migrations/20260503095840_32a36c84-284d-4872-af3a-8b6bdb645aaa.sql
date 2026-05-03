-- Insurance tier enum
DO $$ BEGIN
  CREATE TYPE public.insurance_tier AS ENUM ('normal','silver','gold','vip');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.insurance_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_no text NOT NULL UNIQUE,
  patient_id uuid,
  patient_name text,
  tier public.insurance_tier NOT NULL DEFAULT 'normal',
  discount_percent numeric NOT NULL DEFAULT 0,
  coverage_amount_usd numeric NOT NULL DEFAULT 0,
  used_amount_usd numeric NOT NULL DEFAULT 0,
  provider text,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view insurance" ON public.insurance_cards
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff create insurance" ON public.insurance_cards
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update insurance" ON public.insurance_cards
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete insurance" ON public.insurance_cards
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_insurance_cards_updated_at
  BEFORE UPDATE ON public.insurance_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto card no sequence
CREATE SEQUENCE IF NOT EXISTS public.insurance_card_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_insurance_card_no(_tier public.insurance_tier)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  n bigint;
  prefix text;
BEGIN
  n := nextval('public.insurance_card_seq');
  prefix := CASE _tier
    WHEN 'vip' THEN 'VIP'
    WHEN 'gold' THEN 'GLD'
    WHEN 'silver' THEN 'SLV'
    ELSE 'INS'
  END;
  RETURN prefix || '-' || lpad(n::text, 5, '0');
END; $$;

CREATE INDEX IF NOT EXISTS idx_insurance_cards_patient ON public.insurance_cards(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_cards_tier ON public.insurance_cards(tier);