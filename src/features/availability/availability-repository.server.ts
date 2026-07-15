import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import type {
  AvailabilityConfiguration,
  AvailabilityOverrideInput,
  OccupiedAppointment,
  WeeklyAvailabilityDay,
} from "./availability-domain";

export type AvailabilityQueryExecutor = <T extends Record<string, unknown>>(
  query: string,
  params?: unknown[],
) => Promise<T[]>;

type AvailabilityTransactionQuery = { query: string; params?: unknown[] };

type AvailabilityTransactionExecutor = (
  queries: AvailabilityTransactionQuery[],
) => Promise<Record<string, unknown>[][]>;

export type SaveOverrideResult =
  { success: true; id: string } | { success: false; reason: "overlap" };

export type AvailabilityRepository = {
  loadConfiguration(): Promise<AvailabilityConfiguration>;
  listOccupiedAppointments(startsOn: string, endsOn: string): Promise<OccupiedAppointment[]>;
  replaceWeeklySchedule(days: WeeklyAvailabilityDay[]): Promise<void>;
  saveOverride(input: AvailabilityOverrideInput): Promise<SaveOverrideResult>;
  deleteOverride(id: string): Promise<boolean>;
};

type ConfigurationRow = {
  timezone: AvailabilityConfiguration["timezone"];
  slot_duration_minutes: AvailabilityConfiguration["slotDurationMinutes"];
  weekly: AvailabilityConfiguration["weekly"];
  overrides: AvailabilityConfiguration["overrides"];
};

type OccupiedAppointmentRow = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: OccupiedAppointment["status"];
};

const loadConfigurationQuery = `
SELECT
  settings.timezone,
  settings.slot_duration_minutes,
  (
    SELECT json_agg(
      json_build_object(
        'weekday', day.weekday,
        'isEnabled', day.is_enabled,
        'windows', COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', window.id,
              'startsAt', to_char(window.starts_at, 'HH24:MI'),
              'endsAt', to_char(window.ends_at, 'HH24:MI')
            ) ORDER BY window.sort_order, window.starts_at
          )
          FROM public.weekly_availability_windows window
          WHERE window.weekday = day.weekday
        ), '[]'::json)
      ) ORDER BY day.weekday
    )
    FROM public.weekly_availability_days day
  ) AS weekly,
  COALESCE((
    SELECT json_agg(
      json_build_object(
        'id', override_row.id,
        'kind', override_row.kind,
        'startsOn', override_row.starts_on::text,
        'endsOn', override_row.ends_on::text,
        'note', override_row.note,
        'windows', COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', window.id,
              'startsAt', to_char(window.starts_at, 'HH24:MI'),
              'endsAt', to_char(window.ends_at, 'HH24:MI')
            ) ORDER BY window.sort_order, window.starts_at
          )
          FROM public.availability_date_windows window
          WHERE window.override_id = override_row.id
        ), '[]'::json)
      ) ORDER BY override_row.starts_on, override_row.ends_on
    )
    FROM public.availability_date_overrides override_row
    WHERE override_row.ends_on >= (now() AT TIME ZONE settings.timezone)::date
  ), '[]'::json) AS overrides
FROM public.availability_settings settings
WHERE settings.singleton = true`;

const listOccupiedAppointmentsQuery = `
SELECT
  id,
  appointment_date::text,
  to_char(appointment_time, 'HH24:MI') AS appointment_time,
  status
FROM public.appointments
WHERE appointment_date BETWEEN $1::date AND $2::date
  AND status <> 'cancelled'
ORDER BY appointment_date, appointment_time`;

const replaceWeeklyScheduleQuery = `
WITH payload AS (
  SELECT value AS day
  FROM jsonb_array_elements($1::jsonb)
),
updated_days AS (
  UPDATE public.weekly_availability_days stored
  SET is_enabled = (payload.day->>'isEnabled')::boolean, updated_at = now()
  FROM payload
  WHERE stored.weekday = (payload.day->>'weekday')::smallint
  RETURNING stored.weekday
),
deleted_windows AS (
  DELETE FROM public.weekly_availability_windows
  WHERE weekday IN (SELECT weekday FROM updated_days)
  RETURNING id
)
INSERT INTO public.weekly_availability_windows (weekday, starts_at, ends_at, sort_order)
SELECT
  (payload.day->>'weekday')::smallint,
  (window.value->>'startsAt')::time,
  (window.value->>'endsAt')::time,
  (window.ordinality - 1)::smallint
FROM payload
CROSS JOIN LATERAL jsonb_array_elements(payload.day->'windows')
  WITH ORDINALITY AS window(value, ordinality)
WHERE (SELECT count(*) FROM deleted_windows) >= 0`;

const removeOverrideWindowsQuery = `
DELETE FROM public.availability_date_windows
WHERE override_id = $1::uuid
RETURNING id`;

const saveOverrideQuery = `
INSERT INTO public.availability_date_overrides (id, kind, starts_on, ends_on, note)
VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3::date, $4::date, $5)
ON CONFLICT (id) DO UPDATE
  SET kind = EXCLUDED.kind,
      starts_on = EXCLUDED.starts_on,
      ends_on = EXCLUDED.ends_on,
      note = EXCLUDED.note,
      updated_at = now()
RETURNING id`;

const saveOverrideWindowsQuery = `
INSERT INTO public.availability_date_windows (override_id, starts_at, ends_at, sort_order)
SELECT
  $1::uuid,
  (window.value->>'startsAt')::time,
  (window.value->>'endsAt')::time,
  (window.ordinality - 1)::smallint
FROM jsonb_array_elements($2::jsonb)
  WITH ORDINALITY AS window(value, ordinality)
RETURNING id`;

const deleteOverrideQuery = `
DELETE FROM public.availability_date_overrides
WHERE id = $1::uuid
RETURNING id`;

function isOverrideOverlap(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "constraint" in error &&
    error.code === "23P01" &&
    error.constraint === "availability_date_overrides_no_overlap"
  );
}

export function createAvailabilityRepository(
  execute: AvailabilityQueryExecutor,
  executeTransaction?: AvailabilityTransactionExecutor,
): AvailabilityRepository {
  return {
    async loadConfiguration() {
      const [row] = await execute<ConfigurationRow>(loadConfigurationQuery);
      return {
        timezone: row.timezone,
        slotDurationMinutes: row.slot_duration_minutes,
        weekly: row.weekly,
        overrides: row.overrides,
      };
    },
    async listOccupiedAppointments(startsOn, endsOn) {
      const rows = await execute<OccupiedAppointmentRow>(listOccupiedAppointmentsQuery, [
        startsOn,
        endsOn,
      ]);
      return rows.map((row) => ({
        id: row.id,
        date: row.appointment_date,
        startsAt: row.appointment_time,
        status: row.status,
      }));
    },
    async replaceWeeklySchedule(days) {
      await execute(replaceWeeklyScheduleQuery, [JSON.stringify(days)]);
    },
    async saveOverride(input) {
      try {
        if (!executeTransaction) throw new Error("Availability transactions are not configured");
        const overrideId = input.id ?? randomUUID();
        const [, rows] = await executeTransaction([
          { query: removeOverrideWindowsQuery, params: [input.id ?? null] },
          {
            query: saveOverrideQuery,
            params: [overrideId, input.kind, input.startsOn, input.endsOn, input.note],
          },
          {
            query: saveOverrideWindowsQuery,
            params: [overrideId, JSON.stringify(input.windows)],
          },
        ]);
        return { success: true, id: rows[0].id };
      } catch (error) {
        if (isOverrideOverlap(error)) return { success: false, reason: "overlap" };
        throw error;
      }
    },
    async deleteOverride(id) {
      const rows = await execute<{ id: string }>(deleteOverrideQuery, [id]);
      return Boolean(rows[0]);
    },
  };
}

function createNeonExecutor(): AvailabilityQueryExecutor {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  const sql = neon(databaseUrl);
  return (query, params) => sql.query(query, params) as Promise<Record<string, unknown>[]>;
}

function createNeonTransactionExecutor(): AvailabilityTransactionExecutor {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  const sql = neon(databaseUrl);
  return (queries) =>
    sql.transaction(queries.map(({ query, params }) => sql.query(query, params))) as Promise<
      Record<string, unknown>[][]
    >;
}

export function getNeonAvailabilityRepository() {
  return createAvailabilityRepository(createNeonExecutor(), createNeonTransactionExecutor());
}
