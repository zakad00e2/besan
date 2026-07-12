CREATE TABLE IF NOT EXISTS public.workshop_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id text NOT NULL,
  workshop_name text NOT NULL CHECK (char_length(workshop_name) BETWEEN 2 AND 120),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  mobile text NOT NULL CHECK (char_length(mobile) BETWEEN 7 AND 20),
  email text NOT NULL DEFAULT '' CHECK (char_length(email) <= 254),
  workshop_date date NOT NULL,
  participants integer NOT NULL CHECK (participants >= 1),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'completed', 'cancelled')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workshop_bookings_created_at_idx
  ON public.workshop_bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS workshop_bookings_status_idx
  ON public.workshop_bookings (status);
CREATE INDEX IF NOT EXISTS workshop_bookings_workshop_id_idx
  ON public.workshop_bookings (workshop_id);
