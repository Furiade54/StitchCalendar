-- Add configuration columns to event_types table
ALTER TABLE public.event_types
ADD COLUMN IF NOT EXISTS requires_location boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_url boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS default_recurring boolean DEFAULT false;

-- Ensure requires_end_time exists
ALTER TABLE public.event_types ADD COLUMN IF NOT EXISTS requires_end_time boolean DEFAULT true;

-- Update existing default types with appropriate configuration
UPDATE public.event_types
SET requires_url = true
WHERE name ILIKE 'reunión' OR name ILIKE 'meeting';

UPDATE public.event_types
SET requires_location = true
WHERE name ILIKE 'cita' OR name ILIKE 'appointment' OR name ILIKE 'reunión' OR name ILIKE 'meeting';

UPDATE public.event_types
SET default_recurring = true, requires_end_time = false
WHERE name ILIKE 'cumpleaños' OR name ILIKE 'birthday';

UPDATE public.event_types
SET requires_end_time = false
WHERE name ILIKE 'recordatorio' OR name ILIKE 'reminder';
