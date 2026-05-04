
CREATE TABLE IF NOT EXISTS public.lab_param_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_param_names ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view lab param names" ON public.lab_param_names FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff manage lab param names" ON public.lab_param_names FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
