import { neon } from "@neondatabase/serverless";
import type {
  ValidatedWorkshopBooking,
  WorkshopBookingAdminUpdateInput,
  WorkshopBookingListItem,
  WorkshopBookingStatus,
} from "./workshop-booking";

export type QueryExecutor = <T extends Record<string, unknown>>(
  query: string,
  params?: unknown[],
) => Promise<T[]>;

export type WorkshopBookingRepository = {
  create(booking: ValidatedWorkshopBooking): Promise<{ id: string }>;
  list(): Promise<WorkshopBookingListItem[]>;
  updateStatus(
    id: string,
    status: WorkshopBookingStatus,
  ): Promise<
    { success: true; booking: WorkshopBookingListItem } | { success: false; reason: "not-found" }
  >;
  update(
    id: string,
    input: WorkshopBookingAdminUpdateInput,
  ): Promise<
    { success: true; booking: WorkshopBookingListItem } | { success: false; reason: "not-found" }
  >;
  delete(id: string): Promise<{ success: true } | { success: false; reason: "not-found" }>;
};

type WorkshopBookingRow = {
  id: string;
  workshop_id: string;
  workshop_name: string;
  full_name: string;
  mobile: string;
  email: string;
  workshop_date: string;
  participants: number;
  notes: string;
  status: WorkshopBookingStatus;
  created_at: string;
  updated_at: string;
};

const workshopBookingColumns = `
  id,
  workshop_id,
  workshop_name,
  full_name,
  mobile,
  email,
  workshop_date::text AS workshop_date,
  participants,
  notes,
  status,
  created_at::text AS created_at,
  updated_at::text AS updated_at`;

const createWorkshopBookingQuery = `
INSERT INTO public.workshop_bookings (
  workshop_id,
  workshop_name,
  full_name,
  mobile,
  email,
  workshop_date,
  participants,
  notes
)
VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8)
RETURNING id`;

const listWorkshopBookingsQuery = `
SELECT ${workshopBookingColumns}
FROM public.workshop_bookings
ORDER BY created_at DESC`;

const updateWorkshopBookingStatusQuery = `
UPDATE public.workshop_bookings
SET status = $2, updated_at = now()
WHERE id = $1
RETURNING ${workshopBookingColumns}`;

const updateWorkshopBookingQuery = `
UPDATE public.workshop_bookings
SET full_name = $2, mobile = $3, email = $4, workshop_date = $5::date, participants = $6, updated_at = now()
WHERE id = $1
RETURNING ${workshopBookingColumns}`;

const deleteWorkshopBookingQuery = `
DELETE FROM public.workshop_bookings
WHERE id = $1
RETURNING id`;

function mapWorkshopBookingRow(row: WorkshopBookingRow): WorkshopBookingListItem {
  return {
    id: row.id,
    workshopId: row.workshop_id,
    workshopName: row.workshop_name,
    fullName: row.full_name,
    mobile: row.mobile,
    email: row.email,
    date: row.workshop_date,
    participants: row.participants,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createWorkshopBookingRepository(execute: QueryExecutor): WorkshopBookingRepository {
  return {
    async create(booking) {
      const rows = await execute<{ id: string }>(createWorkshopBookingQuery, [
        booking.workshopId,
        booking.workshopName,
        booking.fullName,
        booking.mobile,
        booking.email,
        booking.date,
        booking.participants,
        booking.notes,
      ]);
      return { id: rows[0].id };
    },
    async list() {
      const rows = await execute<WorkshopBookingRow>(listWorkshopBookingsQuery);
      return rows.map(mapWorkshopBookingRow);
    },
    async updateStatus(id, status) {
      const rows = await execute<WorkshopBookingRow>(updateWorkshopBookingStatusQuery, [
        id,
        status,
      ]);
      const row = rows[0];
      return row
        ? { success: true, booking: mapWorkshopBookingRow(row) }
        : { success: false, reason: "not-found" };
    },
    async update(id, input) {
      const rows = await execute<WorkshopBookingRow>(updateWorkshopBookingQuery, [
        id,
        input.fullName,
        input.mobile,
        input.email,
        input.date,
        input.participants,
      ]);
      const row = rows[0];
      return row
        ? { success: true, booking: mapWorkshopBookingRow(row) }
        : { success: false, reason: "not-found" };
    },
    async delete(id) {
      const rows = await execute<{ id: string }>(deleteWorkshopBookingQuery, [id]);
      return rows[0] ? { success: true } : { success: false, reason: "not-found" };
    },
  };
}

export function getNeonWorkshopBookingRepository(): WorkshopBookingRepository {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

  const sql = neon(databaseUrl);
  const execute: QueryExecutor = (query, params) =>
    sql.query(query, params) as Promise<Record<string, unknown>[]>;
  return createWorkshopBookingRepository(execute);
}
