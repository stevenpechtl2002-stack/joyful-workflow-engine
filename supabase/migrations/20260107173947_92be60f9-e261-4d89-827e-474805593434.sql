-- Add sales_rep_id and notes to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS sales_rep_id UUID,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create RLS policy for sales to view their own acquired customers
CREATE POLICY "Sales can view their acquired customers"
ON public.customers FOR SELECT
USING (
  has_role(auth.uid(), 'sales'::app_role) AND sales_rep_id = auth.uid()
);

-- Sales can view call_logs for their customers
CREATE POLICY "Sales can view call logs of their customers"
ON public.call_logs FOR SELECT
USING (
  has_role(auth.uid(), 'sales'::app_role) AND 
  user_id IN (SELECT id FROM public.customers WHERE sales_rep_id = auth.uid())
);

-- Sales can view reservations of their customers
CREATE POLICY "Sales can view reservations of their customers"
ON public.reservations FOR SELECT
USING (
  has_role(auth.uid(), 'sales'::app_role) AND 
  user_id IN (SELECT id FROM public.customers WHERE sales_rep_id = auth.uid())
);

-- Sales can view daily_stats of their customers
CREATE POLICY "Sales can view stats of their customers"
ON public.daily_stats FOR SELECT
USING (
  has_role(auth.uid(), 'sales'::app_role) AND 
  user_id IN (SELECT id FROM public.customers WHERE sales_rep_id = auth.uid())
);