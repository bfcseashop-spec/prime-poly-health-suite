ALTER TABLE public.shareholder_contributions
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS investment_name text DEFAULT 'Capital Amount Investment',
  ADD COLUMN IF NOT EXISTS slip_url text;