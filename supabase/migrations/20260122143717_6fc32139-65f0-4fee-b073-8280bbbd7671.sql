-- Function to sync reservation customer data to contacts
CREATE OR REPLACE FUNCTION public.sync_reservation_to_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
  v_existing_contact_id uuid;
BEGIN
  -- Only process if we have customer name
  IF NEW.customer_name IS NULL OR NEW.customer_name = '' THEN
    RETURN NEW;
  END IF;

  -- Try to find existing contact by phone (most reliable) or email or name
  SELECT id INTO v_existing_contact_id
  FROM public.contacts
  WHERE user_id = NEW.user_id
    AND (
      -- Match by phone (normalized)
      (NEW.customer_phone IS NOT NULL AND phone IS NOT NULL 
       AND REPLACE(REPLACE(NEW.customer_phone, ' ', ''), '-', '') = REPLACE(REPLACE(phone, ' ', ''), '-', ''))
      -- Or match by email
      OR (NEW.customer_email IS NOT NULL AND email IS NOT NULL 
          AND LOWER(NEW.customer_email) = LOWER(email))
      -- Or match by exact name
      OR LOWER(TRIM(name)) = LOWER(TRIM(NEW.customer_name))
    )
  LIMIT 1;

  IF v_existing_contact_id IS NOT NULL THEN
    -- Update existing contact with any new information
    UPDATE public.contacts
    SET
      phone = COALESCE(NEW.customer_phone, phone),
      email = COALESCE(NEW.customer_email, email),
      booking_count = COALESCE(booking_count, 0) + 1,
      updated_at = now()
    WHERE id = v_existing_contact_id;
    
    v_contact_id := v_existing_contact_id;
  ELSE
    -- Create new contact
    INSERT INTO public.contacts (
      user_id,
      name,
      phone,
      email,
      booking_count,
      original_created_at
    ) VALUES (
      NEW.user_id,
      NEW.customer_name,
      NEW.customer_phone,
      NEW.customer_email,
      1,
      now()
    )
    RETURNING id INTO v_contact_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new reservations
DROP TRIGGER IF EXISTS sync_reservation_contact_trigger ON public.reservations;
CREATE TRIGGER sync_reservation_contact_trigger
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reservation_to_contact();

-- Also create trigger for updates (in case customer info is edited)
DROP TRIGGER IF EXISTS sync_reservation_contact_update_trigger ON public.reservations;
CREATE TRIGGER sync_reservation_contact_update_trigger
  AFTER UPDATE OF customer_name, customer_phone, customer_email ON public.reservations
  FOR EACH ROW
  WHEN (
    OLD.customer_name IS DISTINCT FROM NEW.customer_name OR
    OLD.customer_phone IS DISTINCT FROM NEW.customer_phone OR
    OLD.customer_email IS DISTINCT FROM NEW.customer_email
  )
  EXECUTE FUNCTION public.sync_reservation_to_contact();