CREATE TABLE public.doctors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  specialization text,
  qualification text,
  registration_no text,
  phone text,
  email text,
  gender text,
  department text,
  consultation_fee_usd numeric NOT NULL DEFAULT 0,
  experience_years integer DEFAULT 0,
  joining_date date,
  available_days text,
  available_hours text,
  room_no text,
  photo_url text,
  bio text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view doctors" ON public.doctors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manage doctors" ON public.doctors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();