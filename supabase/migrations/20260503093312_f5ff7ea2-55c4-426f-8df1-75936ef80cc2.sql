
CREATE OR REPLACE FUNCTION public.generate_patient_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.patient_code_seq');
  RETURN 'PD-' || lpad(n::text, 2, '0');
END; $function$;
