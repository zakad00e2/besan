import { neon } from "@neondatabase/serverless";
import type { QueryExecutor } from "./booking-repository.server";

export type BookingPageViewRepository = {
  getLastSeen(supervisorId: string): Promise<string | null>;
  getSnapshotAt(): Promise<string>;
  saveLastSeen(supervisorId: string, seenAt: string): Promise<void>;
};

const lastSeenQuery = `
SELECT last_seen_at::text
FROM public.supervisor_booking_page_views
WHERE supervisor_id = $1`;

const snapshotQuery = `SELECT clock_timestamp()::text AS snapshot_at`;

const saveLastSeenQuery = `
INSERT INTO public.supervisor_booking_page_views (supervisor_id, last_seen_at)
VALUES ($1, $2::timestamptz)
ON CONFLICT (supervisor_id) DO UPDATE
SET last_seen_at = GREATEST(
  public.supervisor_booking_page_views.last_seen_at,
  EXCLUDED.last_seen_at
)`;

export function createBookingPageViewRepository(execute: QueryExecutor): BookingPageViewRepository {
  return {
    async getLastSeen(supervisorId) {
      const rows = await execute<{ last_seen_at: string }>(lastSeenQuery, [supervisorId]);
      return rows[0]?.last_seen_at ?? null;
    },
    async getSnapshotAt() {
      const rows = await execute<{ snapshot_at: string }>(snapshotQuery);
      if (!rows[0]) throw new Error("Missing database snapshot timestamp.");
      return rows[0].snapshot_at;
    },
    async saveLastSeen(supervisorId, seenAt) {
      await execute(saveLastSeenQuery, [supervisorId, seenAt]);
    },
  };
}

function createNeonExecutor(): QueryExecutor {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  const sql = neon(databaseUrl);
  return (query, params) => sql.query(query, params) as Promise<Record<string, unknown>[]>;
}

export function getNeonBookingPageViewRepository() {
  return createBookingPageViewRepository(createNeonExecutor());
}
