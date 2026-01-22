-- Add dashboard_pin column to customers table for PIN protection
ALTER TABLE public.customers 
ADD COLUMN dashboard_pin TEXT DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.customers.dashboard_pin IS 'Optional PIN for protecting sensitive dashboard areas';