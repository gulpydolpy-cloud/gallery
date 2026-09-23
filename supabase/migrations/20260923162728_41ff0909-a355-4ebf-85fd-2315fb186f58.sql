REVOKE ALL ON FUNCTION public.start_live(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_live(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_live(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_live(text) TO service_role;