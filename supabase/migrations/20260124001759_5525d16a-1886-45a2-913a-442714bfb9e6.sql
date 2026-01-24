-- Enable RLS on the customers_sales_view and add appropriate policies
-- The view uses security_invoker=on, so RLS from base table applies
-- But we should ensure the view itself has RLS enabled for extra protection

-- First, let's recreate the view with proper security settings to ensure RLS applies
DROP VIEW IF EXISTS public.customers_sales_view;

CREATE VIEW public.customers_sales_view
WITH (security_invoker = on) AS
SELECT 
  id,
  sales_rep_id,
  created_at,
  updated_at,
  email,
  company_name,
  plan,
  status,
  notes
FROM public.customers;

-- Add comment explaining the security model
COMMENT ON VIEW public.customers_sales_view IS 'Secure view for sales representatives. Excludes sensitive fields like dashboard_pin. Uses security_invoker=on to enforce RLS from base customers table.';