CREATE TABLE IF NOT EXISTS public.ot_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  category TEXT DEFAULT 'general',
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  price_usd NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ot_procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view ot procedures" ON public.ot_procedures FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin doctor manage ot procedures" ON public.ot_procedures FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'doctor'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'doctor'));

CREATE TRIGGER ot_procedures_updated BEFORE UPDATE ON public.ot_procedures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ot_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,
  patient_name TEXT NOT NULL,
  procedure_id UUID,
  procedure_name TEXT NOT NULL,
  surgeon_id UUID,
  surgeon_name TEXT,
  anesthetist_name TEXT,
  anesthesia_type TEXT,
  theater_room TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled',
  priority TEXT NOT NULL DEFAULT 'normal',
  pre_op_notes TEXT,
  post_op_notes TEXT,
  complications TEXT,
  charges_usd NUMERIC NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ot_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view ot bookings" ON public.ot_bookings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff manage ot bookings" ON public.ot_bookings FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER ot_bookings_updated BEFORE UPDATE ON public.ot_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ot_bookings_scheduled_idx ON public.ot_bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS ot_bookings_status_idx ON public.ot_bookings(status);