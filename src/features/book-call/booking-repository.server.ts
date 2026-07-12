import { neon } from "@neondatabase/serverless";
import type { BookingListItem, ValidatedBooking } from "./booking-domain";

export type QueryExecutor = <T extends Record<string, unknown>>(
  query: string,
  params?: unknown[],
) => Promise<T[]>;

export type BookingRepository = {
  create(booking: ValidatedBooking): Promise<
    | { success: true; appointmentId: string }
    | { success: false; reason: "slot-unavailable" }
  >;
  list(): Promise<BookingListItem[]>;
};

type BookingRow = {
  id: string;
  full_name: string;
  mobile: string;
  appointment_type: BookingListItem["appointmentType"];
  appointment_date: string;
  appointment_time: string;
  notes: string;
  status: BookingListItem["status"];
  reminder_status: BookingListItem["reminderStatus"];
  created_at: string;
};

const insertBookingQuery = `
WITH saved_customer AS (
  INSERT INTO public.customers (full_name, mobile)
  VALUES ($1, $2)
  ON CONFLICT (mobile) DO UPDATE
    SET full_name = EXCLUDED.full_name, updated_at = now()
  RETURNING id
)
INSERT INTO public.appointments (
  customer_id, appointment_type, appointment_date, appointment_time, notes
)
SELECT id, $3, $4::date, $5::time, $6
FROM saved_customer
RETURNING id`;

const listBookingsQuery = `
SELECT
  a.id,
  c.full_name,
  c.mobile,
  a.appointment_type,
  a.appointment_date::text,
  to_char(a.appointment_time, 'HH24:MI') AS appointment_time,
  a.notes,
  a.status,
  a.reminder_status,
  a.created_at::text
FROM public.appointments a
JOIN public.customers c ON c.id = a.customer_id
ORDER BY a.appointment_date DESC, a.appointment_time DESC, a.created_at DESC`;

function isActiveSlotConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "constraint" in error &&
    error.code === "23505" &&
    error.constraint === "appointments_active_slot_unique"
  );
}

export function createBookingRepository(execute: QueryExecutor): BookingRepository {
  return {
    async create(booking) {
      try {
        const rows = await execute<{ id: string }>(insertBookingQuery, [
          booking.fullName,
          booking.mobile,
          booking.appointmentType,
          booking.appointmentDate,
          booking.appointmentTime,
          booking.notes,
        ]);
        return { success: true, appointmentId: rows[0].id };
      } catch (error) {
        if (isActiveSlotConflict(error)) return { success: false, reason: "slot-unavailable" };
        throw error;
      }
    },
    async list() {
      const rows = await execute<BookingRow>(listBookingsQuery);
      return rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        mobile: row.mobile,
        appointmentType: row.appointment_type,
        appointmentDate: row.appointment_date,
        appointmentTime: row.appointment_time,
        notes: row.notes,
        status: row.status,
        reminderStatus: row.reminder_status,
        createdAt: row.created_at,
      }));
    },
  };
}

function createNeonExecutor(): QueryExecutor {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  const sql = neon(databaseUrl);
  return (query, params) => sql.query(query, params) as Promise<Record<string, unknown>[]>;
}

export function getNeonBookingRepository() {
  return createBookingRepository(createNeonExecutor());
}
