
CREATE TABLE IF NOT EXISTS public.injections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  dose text,
  route text,
  category text DEFAULT 'general',
  price_usd numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.injections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff view injections" ON public.injections;
CREATE POLICY "Staff view injections" ON public.injections FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admin manage injections" ON public.injections;
CREATE POLICY "Admin manage injections" ON public.injections FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'pharmacist') OR has_role(auth.uid(),'nurse'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'pharmacist') OR has_role(auth.uid(),'nurse'));
DROP TRIGGER IF EXISTS trg_injections_updated ON public.injections;
CREATE TRIGGER trg_injections_updated BEFORE UPDATE ON public.injections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.health_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  name text NOT NULL,
  category text DEFAULT 'general',
  description text,
  total_price_usd numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  final_price_usd numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.health_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff view packages" ON public.health_packages;
CREATE POLICY "Staff view packages" ON public.health_packages FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admin manage packages" ON public.health_packages;
CREATE POLICY "Admin manage packages" ON public.health_packages FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_packages_updated ON public.health_packages;
CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON public.health_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.health_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.health_packages(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  ref_id uuid,
  name text NOT NULL,
  price_usd numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.health_package_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff view package items" ON public.health_package_items;
CREATE POLICY "Staff view package items" ON public.health_package_items FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admin manage package items" ON public.health_package_items;
CREATE POLICY "Admin manage package items" ON public.health_package_items FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
