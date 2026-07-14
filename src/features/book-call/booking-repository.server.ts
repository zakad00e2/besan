import { neon } from "@neondatabase/serverless";
import type { BookingListItem, ValidatedBooking } from "./booking-domain";
import {
  getStageForNextAppointment,
  type ValidatedScheduleNextAppointment,
} from "./booking-domain";

export type QueryExecutor = <T extends Record<string, unknown>>(
  query: string,
  params?: unknown[],
) => Promise<T[]>;

export type BookingRepository = {
  create(
    booking: ValidatedBooking,
  ): Promise<
    { success: true; appointmentId: string } | { success: false; reason: "slot-unavailable" }
  >;
  list(): Promise<BookingListItem[]>;
  scheduleNextAppointment(
    input: ValidatedScheduleNextAppointment,
  ): Promise<
    | { success: true; currentBooking: BookingListItem; nextBooking: BookingListItem }
    | { success: false; reason: "not-found" | "cancelled" | "slot-unavailable" }
  >;
};

type BookingRow = {
  id: string;
  customer_id: string;
  full_name: string;
  mobile: string;
  customer_stage: BookingListItem["customerStage"];
  customer_updated_at: string;
  appointment_type: BookingListItem["appointmentType"];
  appointment_date: string;
  appointment_time: string;
  notes: string;
  status: BookingListItem["status"];
  reminder_status: BookingListItem["reminderStatus"];
  created_at: string;
};

type ScheduleNextRow = {
  outcome: "success" | "not-found" | "cancelled";
  customer_id: string;
  full_name: string;
  mobile: string;
  customer_stage: BookingListItem["customerStage"];
  customer_updated_at: string;
  current_id: string;
  current_appointment_type: BookingListItem["appointmentType"];
  current_appointment_date: string;
  current_appointment_time: string;
  current_notes: string;
  current_status: BookingListItem["status"];
  current_reminder_status: BookingListItem["reminderStatus"];
  current_created_at: string;
  next_id: string;
  next_appointment_type: BookingListItem["appointmentType"];
  next_appointment_date: string;
  next_appointment_time: string;
  next_notes: string;
  next_status: BookingListItem["status"];
  next_reminder_status: BookingListItem["reminderStatus"];
  next_created_at: string;
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
  c.id AS customer_id,
  c.full_name,
  c.mobile,
  c.stage AS customer_stage,
  c.updated_at::text AS customer_updated_at,
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

const scheduleNextAppointmentQuery = `
WITH current_appointment AS (
  SELECT a.*
  FROM public.appointments a
  WHERE a.id = $1
  FOR UPDATE
),
eligible_current AS (
  SELECT * FROM current_appointment WHERE status <> 'cancelled'
),
next_appointment AS (
  INSERT INTO public.appointments (
    customer_id, appointment_type, appointment_date, appointment_time,
    notes, status, reminder_status
  )
  SELECT customer_id, $2, $3::date, $4::time, $5, 'confirmed', $6
  FROM eligible_current
  RETURNING *
),
completed_current AS (
  UPDATE public.appointments a
  SET status = 'completed', updated_at = now()
  FROM next_appointment n
  WHERE a.id = $1
  RETURNING a.*
),
updated_customer AS (
  UPDATE public.customers c
  SET stage = $7, updated_at = now()
  FROM eligible_current e, next_appointment n
  WHERE c.id = e.customer_id
  RETURNING c.*
)
SELECT
  CASE
    WHEN original.id IS NULL THEN 'not-found'
    WHEN original.status = 'cancelled' THEN 'cancelled'
    ELSE 'success'
  END AS outcome,
  customer.id AS customer_id,
  customer.full_name,
  customer.mobile,
  customer.stage AS customer_stage,
  customer.updated_at::text AS customer_updated_at,
  completed.id AS current_id,
  completed.appointment_type AS current_appointment_type,
  completed.appointment_date::text AS current_appointment_date,
  to_char(completed.appointment_time, 'HH24:MI') AS current_appointment_time,
  completed.notes AS current_notes,
  completed.status AS current_status,
  completed.reminder_status AS current_reminder_status,
  completed.created_at::text AS current_created_at,
  next.id AS next_id,
  next.appointment_type AS next_appointment_type,
  next.appointment_date::text AS next_appointment_date,
  to_char(next.appointment_time, 'HH24:MI') AS next_appointment_time,
  next.notes AS next_notes,
  next.status AS next_status,
  next.reminder_status AS next_reminder_status,
  next.created_at::text AS next_created_at
FROM (SELECT 1) singleton
LEFT JOIN current_appointment original ON true
LEFT JOIN completed_current completed ON true
LEFT JOIN next_appointment next ON true
LEFT JOIN updated_customer customer ON true`;

function mapBookingRow(row: BookingRow): BookingListItem {
  return {
    id: row.id,
    customerId: row.customer_id,
    fullName: row.full_name,
    mobile: row.mobile,
    customerStage: row.customer_stage,
    customerUpdatedAt: row.customer_updated_at,
    appointmentType: row.appointment_type,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    notes: row.notes,
    status: row.status,
    reminderStatus: row.reminder_status,
    createdAt: row.created_at,
  };
}

function mapScheduledRow(
  row: ScheduleNextRow,
  prefix: "current" | "next",
): BookingListItem {
  const scheduled = prefix === "current"
    ? {
        id: row.current_id,
        appointmentType: row.current_appointment_type,
        appointmentDate: row.current_appointment_date,
        appointmentTime: row.current_appointment_time,
        notes: row.current_notes,
        status: row.current_status,
        reminderStatus: row.current_reminder_status,
        createdAt: row.current_created_at,
      }
    : {
        id: row.next_id,
        appointmentType: row.next_appointment_type,
        appointmentDate: row.next_appointment_date,
        appointmentTime: row.next_appointment_time,
        notes: row.next_notes,
        status: row.next_status,
        reminderStatus: row.next_reminder_status,
        createdAt: row.next_created_at,
      };

  return {
    ...scheduled,
    customerId: row.customer_id,
    fullName: row.full_name,
    mobile: row.mobile,
    customerStage: row.customer_stage,
    customerUpdatedAt: row.customer_updated_at,
  };
}

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
      return rows.map(mapBookingRow);
    },
    async scheduleNextAppointment(input) {
      try {
        const stage = getStageForNextAppointment(input.appointmentType);
        const rows = await execute<ScheduleNextRow>(scheduleNextAppointmentQuery, [
          input.currentAppointmentId,
          input.appointmentType,
          input.appointmentDate,
          input.appointmentTime,
          input.notes,
          input.reminderStatus,
          stage,
        ]);
        const row = rows[0];
        if (!row || row.outcome === "not-found") {
          return { success: false, reason: "not-found" };
        }
        if (row.outcome === "cancelled") {
          return { success: false, reason: "cancelled" };
        }
        return {
          success: true,
          currentBooking: mapScheduledRow(row, "current"),
          nextBooking: mapScheduledRow(row, "next"),
        };
      } catch (error) {
        if (isActiveSlotConflict(error)) return { success: false, reason: "slot-unavailable" };
        throw error;
      }
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
