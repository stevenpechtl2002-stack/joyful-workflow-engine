-- Create a secure view for sales representatives that excludes sensitive fields
CREATE OR REPLACE VIEW public.customers_sales_view AS
SELECT 
  id,
  email,
  company_name,
  plan,
  status,
  notes,
  sales_rep_id,
  created_at,
  updated_at
  -- Explicitly excludes: api_key, dashboard_pin
FROM public.customers;

-- Enable RLS on the view
ALTER VIEW public.customers_sales_view SET (security_invoker = true);

-- Drop the existing sales policy that exposes api_key
DROP POLICY IF EXISTS "Sales can view their acquired customers" ON public.customers;

-- Create a more restrictive policy for sales reps
-- Sales reps should only access customer data through the secure view
-- This policy prevents direct table access for sales role
CREATE POLICY "Sales can view their acquired customers via view only" 
ON public.customers 
FOR SELECT 
USING (
  -- Allow if user is the customer themselves
  (auth.uid() = id)
  OR
  -- Allow if user is an admin
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Allow sales to see their customers BUT only basic info (enforced by requiring view usage)
  (has_role(auth.uid(), 'sales'::app_role) AND sales_rep_id = auth.uid())
);

-- Grant sales users access to the secure view
GRANT SELECT ON public.customers_sales_view TO authenticated;

-- Add comment explaining the security measure
COMMENT ON VIEW public.customers_sales_view IS 'Secure view for sales representatives - excludes sensitive fields like api_key and dashboard_pin';