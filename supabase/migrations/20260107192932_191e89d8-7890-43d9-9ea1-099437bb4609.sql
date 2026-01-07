-- Update source check constraint to include 'n8n' as valid source
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_source_check;

ALTER TABLE public.reservations ADD CONSTRAINT reservations_source_check 
CHECK (source = ANY (ARRAY['voice_agent'::text, 'manual'::text, 'website'::text, 'phone'::text, 'n8n'::text]));