
-- Rooms (20 rooms in clinic)
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_no TEXT NOT NULL UNIQUE,
  room_type TEXT NOT NULL DEFAULT 'general', -- general, private, vip, icu, cabin
  floor TEXT,
  bed_count INTEGER NOT NULL DEFAULT 1,
  daily_rate_usd NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, maintenance
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view rooms" ON public.rooms FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manage rooms" ON public.rooms FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'receptionist') OR has_role(auth.uid(),'nurse'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'receptionist') OR has_role(auth.uid(),'nurse'));

CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admissions (in-patient)
CREATE SEQUENCE IF NOT EXISTS public.admission_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_admission_no()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RETURN 'ADM-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.admission_seq')::text, 4, '0'); END; $$;

CREATE TABLE public.admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no TEXT NOT NULL DEFAULT generate_admission_no() UNIQUE,
  patient_id UUID NOT NULL,
  room_id UUID,
  bed_no TEXT,
  doctor_id UUID,
  doctor_name TEXT,
  admission_type TEXT NOT NULL DEFAULT 'general', -- general, emergency, surgery, observation
  diagnosis TEXT,
  reason TEXT,
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_discharge DATE,
  discharged_at TIMESTAMPTZ,
  discharge_notes TEXT,
  status TEXT NOT NULL DEFAULT 'admitted', -- admitted, discharged, transferred
  daily_rate_usd NUMERIC NOT NULL DEFAULT 0,
  total_charges_usd NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view admissions" ON public.admissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff manage admissions" ON public.admissions FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER admissions_updated_at BEFORE UPDATE ON public.admissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_admissions_status ON public.admissions(status);
CREATE INDEX idx_admissions_patient ON public.admissions(patient_id);
CREATE INDEX idx_admissions_room ON public.admissions(room_id);

-- Auto room status sync
CREATE OR REPLACE FUNCTION public.sync_room_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'admitted' AND NEW.room_id IS NOT NULL THEN
    UPDATE public.rooms SET status = 'occupied' WHERE id = NEW.room_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'discharged' AND OLD.status = 'admitted' AND OLD.room_id IS NOT NULL THEN
      UPDATE public.rooms SET status = 'available' WHERE id = OLD.room_id
        AND NOT EXISTS (SELECT 1 FROM public.admissions WHERE room_id = OLD.room_id AND status = 'admitted' AND id <> OLD.id);
    END IF;
    IF NEW.room_id IS DISTINCT FROM OLD.room_id THEN
      IF OLD.room_id IS NOT NULL THEN
        UPDATE public.rooms SET status = 'available' WHERE id = OLD.room_id
          AND NOT EXISTS (SELECT 1 FROM public.admissions WHERE room_id = OLD.room_id AND status = 'admitted' AND id <> NEW.id);
      END IF;
      IF NEW.room_id IS NOT NULL AND NEW.status = 'admitted' THEN
        UPDATE public.rooms SET status = 'occupied' WHERE id = NEW.room_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER admissions_sync_room AFTER INSERT OR UPDATE ON public.admissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_room_status();

-- Seed 20 rooms
INSERT INTO public.rooms (room_no, room_type, floor, bed_count, daily_rate_usd) VALUES
  ('101','general','1st',1,15),('102','general','1st',1,15),('103','general','1st',1,15),
  ('104','general','1st',1,15),('105','private','1st',1,30),('106','private','1st',1,30),
  ('201','general','2nd',1,15),('202','general','2nd',1,15),('203','general','2nd',1,15),
  ('204','private','2nd',1,30),('205','private','2nd',1,30),('206','vip','2nd',1,60),
  ('301','general','3rd',1,15),('302','general','3rd',1,15),('303','private','3rd',1,30),
  ('304','vip','3rd',1,60),('305','vip','3rd',1,60),('ICU-1','icu','GF',1,80),
  ('ICU-2','icu','GF',1,80),('ICU-3','icu','GF',1,80);
