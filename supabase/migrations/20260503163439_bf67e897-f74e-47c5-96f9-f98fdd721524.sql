CREATE TABLE IF NOT EXISTS public.investments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_amount_usd numeric not null default 0,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view investments" ON public.investments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manage investments" ON public.investments FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER investments_set_updated BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();