CREATE TABLE IF NOT EXISTS public.supervisor_booking_page_views (
  supervisor_id text PRIMARY KEY,
  last_seen_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS supervisor_booking_page_views_last_seen_at_idx
  ON public.supervisor_booking_page_views (last_seen_at DESC);
