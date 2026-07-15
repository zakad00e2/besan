CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.availability_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  timezone text NOT NULL DEFAULT 'Asia/Jerusalem' CHECK (timezone = 'Asia/Jerusalem'),
  slot_duration_minutes smallint NOT NULL DEFAULT 60 CHECK (slot_duration_minutes = 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.availability_settings (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.weekly_availability_days (
  weekday smallint PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  is_enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.weekly_availability_days (weekday, is_enabled)
VALUES
  (0, true), (1, true), (2, true), (3, true),
  (4, false), (5, true), (6, true)
ON CONFLICT (weekday) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.weekly_availability_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday smallint NOT NULL REFERENCES public.weekly_availability_days(weekday) ON DELETE CASCADE,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  CHECK (ends_at > starts_at),
  CHECK (extract(second FROM starts_at) = 0 AND extract(second FROM ends_at) = 0),
  CHECK (mod(extract(minute FROM starts_at)::integer, 30) = 0),
  CHECK (mod(extract(minute FROM ends_at)::integer, 30) = 0),
  CHECK (extract(epoch FROM (ends_at - starts_at)) >= 3600),
  CHECK (mod(extract(epoch FROM (ends_at - starts_at))::integer, 3600) = 0),
  EXCLUDE USING gist (
    weekday WITH =,
    tsrange(date '2000-01-01' + starts_at, date '2000-01-01' + ends_at, '[)') WITH &&
  )
);

INSERT INTO public.weekly_availability_windows (weekday, starts_at, ends_at, sort_order)
SELECT generated.weekday, time '11:00', time '17:00', 0
FROM generate_series(0, 6) AS generated(weekday)
WHERE NOT EXISTS (
  SELECT 1 FROM public.weekly_availability_windows existing
  WHERE existing.weekday = generated.weekday
);

CREATE TABLE IF NOT EXISTS public.availability_date_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('closed', 'custom-hours')),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 240),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on),
  CHECK (kind <> 'custom-hours' OR starts_on = ends_on),
  EXCLUDE USING gist (daterange(starts_on, ends_on, '[]') WITH &&)
);

CREATE TABLE IF NOT EXISTS public.availability_date_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  override_id uuid NOT NULL REFERENCES public.availability_date_overrides(id) ON DELETE CASCADE,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  CHECK (ends_at > starts_at),
  CHECK (extract(second FROM starts_at) = 0 AND extract(second FROM ends_at) = 0),
  CHECK (mod(extract(minute FROM starts_at)::integer, 30) = 0),
  CHECK (mod(extract(minute FROM ends_at)::integer, 30) = 0),
  CHECK (extract(epoch FROM (ends_at - starts_at)) >= 3600),
  CHECK (mod(extract(epoch FROM (ends_at - starts_at))::integer, 3600) = 0),
  EXCLUDE USING gist (
    override_id WITH =,
    tsrange(date '2000-01-01' + starts_at, date '2000-01-01' + ends_at, '[)') WITH &&
  )
);

CREATE OR REPLACE FUNCTION public.ensure_custom_hours_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.availability_date_overrides override_row
    WHERE override_row.id = NEW.override_id
      AND override_row.kind = 'custom-hours'
  ) THEN
    RAISE EXCEPTION 'Date windows require a custom-hours override';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS availability_date_windows_custom_hours
  ON public.availability_date_windows;
CREATE TRIGGER availability_date_windows_custom_hours
BEFORE INSERT OR UPDATE ON public.availability_date_windows
FOR EACH ROW EXECUTE FUNCTION public.ensure_custom_hours_window();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.appointments first_appointment
    JOIN public.appointments second_appointment
      ON first_appointment.id < second_appointment.id
     AND first_appointment.status <> 'cancelled'
     AND second_appointment.status <> 'cancelled'
     AND tsrange(
       first_appointment.appointment_date + first_appointment.appointment_time,
       first_appointment.appointment_date + first_appointment.appointment_time + interval '60 minutes',
       '[)'
     ) && tsrange(
       second_appointment.appointment_date + second_appointment.appointment_time,
       second_appointment.appointment_date + second_appointment.appointment_time + interval '60 minutes',
       '[)'
     )
  ) THEN
    RAISE EXCEPTION 'Existing active appointments overlap; review them before applying migration 004';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_active_time_overlap'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_active_time_overlap
      EXCLUDE USING gist (
        tsrange(
          appointment_date + appointment_time,
          appointment_date + appointment_time + interval '60 minutes',
          '[)'
        ) WITH &&
      )
      WHERE (status <> 'cancelled');
  END IF;
END;
$$;
