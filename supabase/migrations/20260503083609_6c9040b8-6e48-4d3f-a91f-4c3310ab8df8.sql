
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_patient_code() SET search_path = public;
ALTER FUNCTION public.generate_invoice_no() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_patient_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_no() FROM anon, authenticated;
