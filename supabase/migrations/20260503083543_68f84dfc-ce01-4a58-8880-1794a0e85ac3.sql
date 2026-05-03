
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin','doctor','nurse','pharmacist','lab_tech','accountant','receptionist');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id;
$$;

-- Profile RLS
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles RLS
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Auto profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  -- assign default role from metadata or receptionist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'receptionist'));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Patients
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT,
  dob DATE,
  phone TEXT,
  address TEXT,
  blood_group TEXT,
  insurance_provider TEXT,
  insurance_policy TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Patient code sequence
CREATE SEQUENCE public.patient_code_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_patient_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'PPC-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.patient_code_seq')::text, 4, '0');
END; $$;

CREATE POLICY "Staff view patients" ON public.patients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff create patients" ON public.patients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff update patients" ON public.patients FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete patients" ON public.patients FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- OPD visits
CREATE TABLE public.opd_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT current_date,
  token_number INT,
  doctor_id UUID REFERENCES auth.users(id),
  chief_complaint TEXT,
  bp TEXT, temperature NUMERIC, weight NUMERIC, height NUMERIC, spo2 NUMERIC, pulse NUMERIC,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.opd_visits ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER opd_updated BEFORE UPDATE ON public.opd_visits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Staff manage opd" ON public.opd_visits FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Prescriptions
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES public.opd_visits(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES auth.users(id),
  diagnosis TEXT,
  advice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage rx" ON public.prescriptions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- medicine | injection | lab | xray
  name TEXT NOT NULL,
  dose TEXT,
  frequency TEXT,
  duration TEXT,
  route TEXT,
  instructions TEXT
);
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage rx items" ON public.prescription_items FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Medicines
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  unit TEXT,
  price_usd NUMERIC NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 10,
  expiry_date DATE,
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER medicines_updated BEFORE UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Staff view medicines" ON public.medicines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Pharmacy manage medicines" ON public.medicines FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'pharmacist')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'pharmacist'));

-- Sales
CREATE TABLE public.medicine_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  subtotal_usd NUMERIC NOT NULL DEFAULT 0,
  discount_usd NUMERIC NOT NULL DEFAULT 0,
  tax_usd NUMERIC NOT NULL DEFAULT 0,
  total_usd NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- cash, aba, acleda, paypal, visa
  cashier_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medicine_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage sales" ON public.medicine_sales FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE SEQUENCE public.invoice_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_invoice_no()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN RETURN 'INV-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.invoice_seq')::text,5,'0'); END; $$;

CREATE TABLE public.medicine_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.medicine_sales(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id),
  name TEXT NOT NULL,
  quantity INT NOT NULL,
  price_usd NUMERIC NOT NULL,
  total_usd NUMERIC NOT NULL
);
ALTER TABLE public.medicine_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage sale items" ON public.medicine_sale_items FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
