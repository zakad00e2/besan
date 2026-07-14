ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_appointment_type_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_appointment_type_check CHECK (
    appointment_type IN (
      'New Design',
      'Measurements',
      'First Fitting',
      'Second Fitting',
      'Alteration',
      'Pickup'
    )
  );

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new-inquiry';

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_stage_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_stage_check CHECK (
    stage IN (
      'new-inquiry',
      'initial-appointment',
      'measurements-appointment',
      'measurements-taken',
      'design-production',
      'fitting',
      'ready-delivery',
      'completed'
    )
  );
