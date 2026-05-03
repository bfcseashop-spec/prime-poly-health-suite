
CREATE TABLE public.medicine_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.medicine_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medicine_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read units" ON public.medicine_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write units" ON public.medicine_units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update units" ON public.medicine_units FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete units" ON public.medicine_units FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read cats" ON public.medicine_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write cats" ON public.medicine_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update cats" ON public.medicine_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete cats" ON public.medicine_categories FOR DELETE TO authenticated USING (true);

INSERT INTO public.medicine_units (name) VALUES ('Pcs'),('Pata'),('Packet'),('Box'),('Vial'),('Bottle'),('ml'),('Tablet'),('Capsule'),('Syrup') ON CONFLICT DO NOTHING;
INSERT INTO public.medicine_categories (name) VALUES ('Antibiotic'),('Painkiller'),('Vitamin'),('Antacid'),('Antihistamine'),('Diabetes'),('Cardiac'),('Respiratory'),('Other') ON CONFLICT DO NOTHING;
