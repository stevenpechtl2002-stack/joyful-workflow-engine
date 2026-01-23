-- Step 1: Create a separate secure table for API keys
CREATE TABLE public.customer_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  api_key uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 2: Enable RLS on the new API keys table
ALTER TABLE public.customer_api_keys ENABLE ROW LEVEL SECURITY;

-- Step 3: Create restrictive RLS policies - ONLY the customer and admins can see API keys
CREATE POLICY "Only customer can view their own API key"
ON public.customer_api_keys
FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Admins can manage all API keys"
ON public.customer_api_keys
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can update their own API key"
ON public.customer_api_keys
FOR UPDATE
USING (auth.uid() = customer_id);

-- Step 4: Migrate existing API keys to the new table
INSERT INTO public.customer_api_keys (customer_id, api_key, created_at, updated_at)
SELECT id, api_key, created_at, updated_at
FROM public.customers
WHERE api_key IS NOT NULL
ON CONFLICT (customer_id) DO NOTHING;

-- Step 5: Drop the old view and recreate without api_key reference issue
DROP VIEW IF EXISTS public.customers_sales_view;

-- Step 6: Update customers table - remove api_key column (sensitive data now in separate table)
ALTER TABLE public.customers DROP COLUMN IF EXISTS api_key;

-- Step 7: Recreate the sales view (now customers table has no api_key)
CREATE VIEW public.customers_sales_view 
WITH (security_invoker = true)
AS
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
  -- dashboard_pin is intentionally excluded
FROM public.customers
WHERE 
  -- Only show customers assigned to the current sales rep
  has_role(auth.uid(), 'sales'::app_role) AND sales_rep_id = auth.uid();

-- Step 8: Grant access to the view
GRANT SELECT ON public.customers_sales_view TO authenticated;

-- Step 9: Add trigger for updated_at on api_keys table
CREATE TRIGGER update_customer_api_keys_updated_at
BEFORE UPDATE ON public.customer_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.customer_api_keys IS 'Secure storage for customer API keys - only accessible by the customer themselves and admins';
COMMENT ON VIEW public.customers_sales_view IS 'Secure view for sales representatives - excludes sensitive fields and filters to only assigned customers';