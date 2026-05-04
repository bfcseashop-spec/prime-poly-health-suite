CREATE TABLE public.lab_sample_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_sample_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view lab samples" ON public.lab_sample_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff manage lab samples" ON public.lab_sample_types FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);