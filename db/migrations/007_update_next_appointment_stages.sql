ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_appointment_type_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_appointment_type_check CHECK (
    appointment_type IN (
      'Custom Design',
      'Consultation',
      'Dresses for Rent',
      'New Design',
      'Measurements',
      'First Fitting',
      'Second Fitting',
      'Alteration',
      'Pickup',
      'Initial Consultation',
      'Final Fitting & Pickup'
    )
  );
