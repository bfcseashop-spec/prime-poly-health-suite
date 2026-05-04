
CREATE TABLE IF NOT EXISTS public.lab_param_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_param_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view lab units" ON public.lab_param_units FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff manage lab units" ON public.lab_param_units FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.lab_param_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_param_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view lab categories" ON public.lab_param_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff manage lab categories" ON public.lab_param_categories FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
