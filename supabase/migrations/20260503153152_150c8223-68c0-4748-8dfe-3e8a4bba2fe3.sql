CREATE TABLE public.shareholders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  phone TEXT,
  email TEXT,
  share_percent NUMERIC NOT NULL DEFAULT 0,
  committed_capital_usd NUMERIC NOT NULL DEFAULT 0,
  joined_on DATE,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shareholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view shareholders" ON public.shareholders
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manage shareholders" ON public.shareholders
FOR ALL USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_shareholders_updated_at
BEFORE UPDATE ON public.shareholders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.shareholder_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shareholder_id UUID NOT NULL,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shareholder_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view contributions" ON public.shareholder_contributions
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manage contributions" ON public.shareholder_contributions
FOR ALL USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_contributions_shareholder ON public.shareholder_contributions(shareholder_id);