-- Drop the failed function first if it exists partially
DROP FUNCTION IF EXISTS public.link_reservations_to_contacts(UUID);

-- Create a simpler function to match reservations with contacts
CREATE OR REPLACE FUNCTION public.link_reservations_to_contacts(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Match by exact name
  WITH updated AS (
    UPDATE public.reservations r
    SET contact_id = c.id
    FROM public.contacts c
    WHERE r.user_id = p_user_id
      AND c.user_id = p_user_id
      AND r.contact_id IS NULL
      AND LOWER(TRIM(r.customer_name)) = LOWER(TRIM(c.name))
    RETURNING r.id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  
  -- Match by phone (if name didn't match)
  WITH updated2 AS (
    UPDATE public.reservations r
    SET contact_id = c.id
    FROM public.contacts c
    WHERE r.user_id = p_user_id
      AND c.user_id = p_user_id
      AND r.contact_id IS NULL
      AND r.customer_phone IS NOT NULL
      AND c.phone IS NOT NULL
      AND REPLACE(REPLACE(r.customer_phone, ' ', ''), '-', '') = REPLACE(REPLACE(c.phone, ' ', ''), '-', '')
    RETURNING r.id
  )
  SELECT v_count + COUNT(*) INTO v_count FROM updated2;
  
  RETURN v_count;
END;
$$;