-- Revoke anonymous SELECT access from sensitive tables
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.appointments FROM anon;
REVOKE SELECT ON public.documents FROM anon;
REVOKE SELECT ON public.notifications FROM anon;
REVOKE SELECT ON public.user_roles FROM anon;