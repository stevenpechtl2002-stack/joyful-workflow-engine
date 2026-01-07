-- Create customers table for tracking customer data
CREATE TABLE public.customers (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  company_name TEXT,
  plan TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own customer record"
ON public.customers FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own customer record"
ON public.customers FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all customers"
ON public.customers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block anonymous access to customers"
ON public.customers FOR SELECT
USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the handle_new_user function to also create customer record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  -- Create customer record (DSGVO-konform: nur notwendige Daten)
  INSERT INTO public.customers (id, email, company_name, plan, status)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data ->> 'company_name',
    'starter',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create welcome notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.id, 'Willkommen!', 'Ihr Account wurde erfolgreich erstellt. Erkunden Sie Ihr Dashboard.', 'success');
  
  RETURN NEW;
END;
$$;