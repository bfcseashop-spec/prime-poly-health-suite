CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text,
  amount_usd numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view expenses" ON public.expenses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff create expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update expenses" ON public.expenses FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete expenses" ON public.expenses FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.staff_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid,
  staff_name text NOT NULL,
  role text,
  amount_usd numeric NOT NULL DEFAULT 0,
  pay_period_month date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view salaries" ON public.staff_salaries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manage salaries" ON public.staff_salaries FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER staff_salaries_updated_at BEFORE UPDATE ON public.staff_salaries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_salaries_paid_on ON public.staff_salaries(paid_on);