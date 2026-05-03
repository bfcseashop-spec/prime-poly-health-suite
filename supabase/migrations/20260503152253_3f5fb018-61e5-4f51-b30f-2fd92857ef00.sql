CREATE TABLE public.admission_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admission_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  from_room_id UUID,
  from_room_no TEXT,
  from_bed_no TEXT,
  to_room_id UUID,
  to_room_no TEXT,
  to_bed_no TEXT,
  from_doctor_name TEXT,
  to_doctor_name TEXT,
  reason TEXT,
  transferred_by UUID,
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admission_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage admission transfers"
ON public.admission_transfers FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_admission_transfers_admission ON public.admission_transfers(admission_id);
CREATE INDEX idx_admission_transfers_patient ON public.admission_transfers(patient_id);