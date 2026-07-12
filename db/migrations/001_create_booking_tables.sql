CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  mobile text NOT NULL UNIQUE CHECK (char_length(mobile) BETWEEN 7 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  appointment_type text NOT NULL CHECK (
    appointment_type IN ('New Design', 'First Fitting', 'Second Fitting', 'Alteration', 'Pickup')
  ),
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'completed', 'cancelled')
  ),
  reminder_status text NOT NULL DEFAULT 'not-scheduled' CHECK (
    reminder_status IN ('not-scheduled', 'scheduled', 'sent')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_customer_id_idx
  ON public.appointments (customer_id);

CREATE INDEX IF NOT EXISTS appointments_created_at_idx
  ON public.appointments (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_unique
  ON public.appointments (appointment_date, appointment_time)
  WHERE status <> 'cancelled';
