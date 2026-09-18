REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_banned(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_views(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_views(uuid) TO authenticated;