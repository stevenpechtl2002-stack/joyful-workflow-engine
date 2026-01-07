-- Add API key column to customers table
ALTER TABLE public.customers 
ADD COLUMN api_key uuid DEFAULT gen_random_uuid() UNIQUE;

-- Generate API keys for existing customers without one
UPDATE public.customers 
SET api_key = gen_random_uuid() 
WHERE api_key IS NULL;

-- Make api_key NOT NULL after populating
ALTER TABLE public.customers 
ALTER COLUMN api_key SET NOT NULL;

-- Create index for fast API key lookups
CREATE INDEX idx_customers_api_key ON public.customers(api_key);