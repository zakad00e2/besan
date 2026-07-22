ALTER TABLE public.workshop_bookings
  ALTER COLUMN workshop_date DROP NOT NULL;

ALTER TABLE public.workshop_bookings
  ADD CONSTRAINT workshop_bookings_corset_date_required
  CHECK (workshop_id <> 'corset-workshop' OR workshop_date IS NOT NULL);
