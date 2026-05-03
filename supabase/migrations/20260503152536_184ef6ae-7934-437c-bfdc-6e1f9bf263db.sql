CREATE TABLE public.staff_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  position TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  joining_date DATE,
  monthly_salary_usd NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  photo_url TEXT,
  qualification TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view staff members"
ON public.staff_members FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manage staff members"
ON public.staff_members FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_staff_members_updated_at
BEFORE UPDATE ON public.staff_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_staff_members_position ON public.staff_members(position);
CREATE INDEX idx_staff_members_status ON public.staff_members(status);