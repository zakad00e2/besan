# Database-Backed Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the supervisor's recurring schedule and date exceptions in Neon, make that schedule authoritative for `/book-call`, and preserve existing bookings while warning about conflicts.

**Architecture:** A pure availability domain module validates schedules and resolves 60-minute slots. A server-only Neon repository persists normalized weekly rules and date overrides, while narrow server functions expose authenticated administration and public month/day projections. The dashboard edits canonical server state; the public booking service revalidates the selected slot before inserting under a Postgres overlap constraint.

**Tech Stack:** TypeScript 5.8, React 19, TanStack Start/Router, Neon Serverless Postgres, Zod 3, Vitest 4, Testing Library, Tailwind CSS 4, Radix UI.

## Global Constraints

- Business timezone: `Asia/Jerusalem`.
- Appointment duration: exactly `60` minutes; it is displayed but not editable.
- Default hours: Sunday, Monday, Tuesday, Wednesday, Friday, and Saturday from `11:00` to `17:00`; Thursday is closed.
- Weekly and custom windows use 30-minute boundaries, last at least 60 minutes, do not overlap, and contain a whole number of 60-minute slots.
- A `closed` override may span an inclusive date range; a `custom-hours` override applies to one date only.
- Date override ranges never overlap.
- Availability changes never cancel, reschedule, or mutate existing appointments.
- Public responses expose only date and slot data; supervisor notes and booking/customer data remain private.
- Reminder settings remain simulated and are not persisted by this feature.
- Do not fall back to demo or hard-coded availability when Neon reads fail.
- Preserve unrelated changes in the dirty worktree and stage only files named by each task.

---

## File Structure

- Create `db/migrations/004_create_availability_tables.sql`: normalized availability schema, default seed, overlap preflight, and active-appointment exclusion constraint.
- Create `src/features/availability/availability-migration.test.ts`: source-level migration contract test.
- Create `src/features/availability/availability-domain.ts`: types, Zod validation, timezone helpers, rule precedence, slot generation, and conflict detection.
- Create `src/features/availability/availability-domain.test.ts`: pure scheduling behavior tests.
- Create `src/features/availability/availability-repository.server.ts`: Neon queries and repository interface.
- Create `src/features/availability/availability-repository.server.test.ts`: repository query, mapping, and mutation tests.
- Create `src/features/availability/availability-service.ts`: public reads, admin authorization, conflict-confirmation workflow, and sanitized failures.
- Create `src/features/availability/availability-service.test.ts`: service and authorization tests.
- Create `src/features/availability/availability.functions.ts`: TanStack server-function adapters.
- Modify `src/features/book-call/booking-domain.ts`: retain shape validation but remove hard-coded schedule validation.
- Modify `src/features/book-call/booking-domain.test.ts`: assert schedule-independent parsing.
- Modify `src/features/book-call/booking-service.ts`: revalidate against canonical availability before insert.
- Modify `src/features/book-call/booking-service.test.ts`: cover stale, closed, and available slots.
- Modify `src/features/book-call/booking.functions.ts`: inject the Neon availability repository.
- Modify `src/features/book-call/booking-repository.server.ts`: translate the new overlap exclusion constraint.
- Modify `src/features/book-call/booking-repository.server.test.ts`: cover the `23P01` conflict.
- Create `src/features/dashboard/use-dashboard-availability.ts`: authenticated load/mutation controller.
- Create `src/features/dashboard/use-dashboard-availability.test.tsx`: controller behavior tests.
- Rewrite `src/features/dashboard/dashboard-availability.tsx`: weekly editor, override list/dialog, conflict confirmation, and unchanged simulated reminders.
- Rewrite `src/features/dashboard/dashboard-availability.test.tsx`: supervisor interaction tests.
- Modify `src/routes/dashboard/availability.tsx`: wire auth, controller, persisted data, and reminders.
- Create `src/features/book-call/use-booking-availability.ts`: public month/day availability controller.
- Create `src/features/book-call/use-booking-availability.test.tsx`: public controller tests.
- Modify `src/routes/book-call.tsx`: remove fixed days/times and consume persisted availability.
- Create `src/routes/-book-call.test.tsx`: calendar, slot refresh, and stale-slot form tests.
- Modify `src/features/dashboard/dashboard-model.ts`, `dashboard-data.ts`, and `dashboard-store.tsx`: remove obsolete demo availability state while keeping reminder state.
- Modify affected dashboard model/store tests to prove the cleanup does not change unrelated behavior.

---

### Task 1: Create the Availability Schema and Appointment Overlap Guard

**Files:**

- Create: `db/migrations/004_create_availability_tables.sql`
- Create: `src/features/availability/availability-migration.test.ts`

**Interfaces:**

- Consumes: existing `public.appointments(appointment_date, appointment_time, status)` from `db/migrations/001_create_booking_tables.sql`.
- Produces: `availability_settings`, `weekly_availability_days`, `weekly_availability_windows`, `availability_date_overrides`, `availability_date_windows`, and constraint `appointments_active_time_overlap`.

- [ ] **Step 1: Write the failing migration contract test**

Create `src/features/availability/availability-migration.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../db/migrations/004_create_availability_tables.sql", import.meta.url),
);

describe("availability migration", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("creates normalized weekly and date-override storage", () => {
    for (const table of [
      "availability_settings",
      "weekly_availability_days",
      "weekly_availability_windows",
      "availability_date_overrides",
      "availability_date_windows",
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }
    expect(sql).toContain("Asia/Jerusalem");
    expect(sql).toContain("slot_duration_minutes");
    expect(sql).toMatch(/\(4, false\)/);
  });

  it("protects active 60-minute ranges without modifying bookings", () => {
    expect(sql).toContain("appointments_active_time_overlap");
    expect(sql).toContain("EXCLUDE USING gist");
    expect(sql).toContain("status <> 'cancelled'");
    expect(sql).toContain("Existing active appointments overlap");
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.appointments/i);
    expect(sql).not.toMatch(/UPDATE\s+public\.appointments/i);
  });
});
```

- [ ] **Step 2: Run the contract test and observe the missing-file failure**

Run:

```powershell
npx vitest run src/features/availability/availability-migration.test.ts
```

Expected: FAIL because `db/migrations/004_create_availability_tables.sql` does not exist.

- [ ] **Step 3: Add the idempotent migration**

Create `db/migrations/004_create_availability_tables.sql` with this schema and seed:

```sql
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
```

- [ ] **Step 4: Run the migration contract test and SQL formatting check**

Run:

```powershell
npx vitest run src/features/availability/availability-migration.test.ts
git diff --check -- db/migrations/004_create_availability_tables.sql src/features/availability/availability-migration.test.ts
```

Expected: the test passes and `git diff --check` prints no errors.

- [ ] **Step 5: Commit the schema contract**

```powershell
git add db/migrations/004_create_availability_tables.sql src/features/availability/availability-migration.test.ts
git commit -m "feat: define persisted availability schema"
```

---

### Task 2: Build the Pure Availability Domain

**Files:**

- Create: `src/features/availability/availability-domain.ts`
- Create: `src/features/availability/availability-domain.test.ts`

**Interfaces:**

- Produces: `AvailabilityConfiguration`, `WeeklyScheduleInput`, `AvailabilityOverrideInput`, `OccupiedAppointment`, `AvailableSlot`, `parseWeeklySchedule`, `parseAvailabilityOverride`, `resolveAvailableSlots`, `findScheduleConflicts`, `getLocalDateInTimeZone`, and `listMonthDates`.
- Consumes: no database or React APIs.

- [ ] **Step 1: Write failing tests for defaults, validation, precedence, and conflicts**

Create `src/features/availability/availability-domain.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEEKLY_SCHEDULE,
  findScheduleConflicts,
  getLocalDateInTimeZone,
  parseAvailabilityOverride,
  parseWeeklySchedule,
  resolveAvailableSlots,
  type AvailabilityConfiguration,
} from "./availability-domain";

const configuration: AvailabilityConfiguration = {
  timezone: "Asia/Jerusalem",
  slotDurationMinutes: 60,
  weekly: DEFAULT_WEEKLY_SCHEDULE,
  overrides: [],
};

describe("availability domain", () => {
  it("seeds every day, closes Thursday, and creates six one-hour slots", () => {
    expect(DEFAULT_WEEKLY_SCHEDULE).toHaveLength(7);
    expect(DEFAULT_WEEKLY_SCHEDULE[4].isEnabled).toBe(false);
    expect(
      resolveAvailableSlots(configuration, "2026-07-19", [], new Date("2026-07-15T09:00:00Z")),
    ).toEqual([
      { startsAt: "11:00", endsAt: "12:00" },
      { startsAt: "12:00", endsAt: "13:00" },
      { startsAt: "13:00", endsAt: "14:00" },
      { startsAt: "14:00", endsAt: "15:00" },
      { startsAt: "15:00", endsAt: "16:00" },
      { startsAt: "16:00", endsAt: "17:00" },
    ]);
    expect(
      resolveAvailableSlots(configuration, "2026-07-16", [], new Date("2026-07-15T09:00:00Z")),
    ).toEqual([]);
  });

  it("rejects overlapping, short, and partial-slot windows", () => {
    const overlapping = DEFAULT_WEEKLY_SCHEDULE.map((day) =>
      day.weekday === 1
        ? {
            ...day,
            windows: [
              { startsAt: "11:00", endsAt: "14:00" },
              { startsAt: "13:30", endsAt: "15:30" },
            ],
          }
        : day,
    );
    expect(parseWeeklySchedule({ days: overlapping }).success).toBe(false);
    expect(
      parseWeeklySchedule({
        days: DEFAULT_WEEKLY_SCHEDULE.map((day) =>
          day.weekday === 1 ? { ...day, windows: [{ startsAt: "11:00", endsAt: "11:30" }] } : day,
        ),
      }).success,
    ).toBe(false);
    expect(
      parseWeeklySchedule({
        days: DEFAULT_WEEKLY_SCHEDULE.map((day) =>
          day.weekday === 1 ? { ...day, windows: [{ startsAt: "11:00", endsAt: "12:30" }] } : day,
        ),
      }).success,
    ).toBe(false);
  });

  it("lets an inclusive closure range override recurring hours", () => {
    const closed = {
      ...configuration,
      overrides: [
        {
          id: "leave",
          kind: "closed" as const,
          startsOn: "2026-07-20",
          endsOn: "2026-07-22",
          note: "Travel",
          windows: [],
        },
      ],
    };
    for (const date of ["2026-07-20", "2026-07-21", "2026-07-22"]) {
      expect(resolveAvailableSlots(closed, date, [], new Date("2026-07-15T09:00:00Z"))).toEqual([]);
    }
  });

  it("uses single-day custom hours and supports half-hour starts", () => {
    const custom = {
      ...configuration,
      overrides: [
        {
          id: "custom",
          kind: "custom-hours" as const,
          startsOn: "2026-07-16",
          endsOn: "2026-07-16",
          note: "Thursday opening",
          windows: [{ startsAt: "11:30", endsAt: "13:30" }],
        },
      ],
    };
    expect(
      resolveAvailableSlots(custom, "2026-07-16", [], new Date("2026-07-15T09:00:00Z")),
    ).toEqual([
      { startsAt: "11:30", endsAt: "12:30" },
      { startsAt: "12:30", endsAt: "13:30" },
    ]);
  });

  it("removes whole-hour slots that overlap active half-hour bookings", () => {
    expect(
      resolveAvailableSlots(
        configuration,
        "2026-07-19",
        [{ id: "booking", date: "2026-07-19", startsAt: "12:30", status: "confirmed" }],
        new Date("2026-07-15T09:00:00Z"),
      ).map((slot) => slot.startsAt),
    ).toEqual(["11:00", "14:00", "15:00", "16:00"]);
  });

  it("does not let cancelled bookings block slots", () => {
    expect(
      resolveAvailableSlots(
        configuration,
        "2026-07-19",
        [{ id: "booking", date: "2026-07-19", startsAt: "12:00", status: "cancelled" }],
        new Date("2026-07-15T09:00:00Z"),
      ),
    ).toHaveLength(6);
  });

  it("finds affected bookings without mutating them", () => {
    const closed = {
      ...configuration,
      overrides: [
        {
          id: "leave",
          kind: "closed" as const,
          startsOn: "2026-07-20",
          endsOn: "2026-07-22",
          note: "Travel",
          windows: [],
        },
      ],
    };
    const bookings = [
      { id: "inside", date: "2026-07-21", startsAt: "11:00", status: "confirmed" as const },
      { id: "outside", date: "2026-07-26", startsAt: "11:00", status: "confirmed" as const },
    ];
    expect(
      findScheduleConflicts(configuration, closed, bookings, new Date("2026-07-15T09:00:00Z")),
    ).toEqual([bookings[0]]);
  });

  it("validates override ranges and Palestine local dates", () => {
    expect(
      parseAvailabilityOverride({
        kind: "closed",
        startsOn: "2026-08-20",
        endsOn: "2026-08-10",
        note: "Travel",
        windows: [],
      }).success,
    ).toBe(false);
    expect(
      parseAvailabilityOverride({
        kind: "custom-hours",
        startsOn: "2026-08-10",
        endsOn: "2026-08-11",
        note: "",
        windows: [{ startsAt: "11:00", endsAt: "17:00" }],
      }).success,
    ).toBe(false);
    expect(getLocalDateInTimeZone(new Date("2026-07-15T21:30:00Z"))).toBe("2026-07-16");
  });
});
```

- [ ] **Step 2: Run the domain test and observe the missing-module failure**

Run:

```powershell
npx vitest run src/features/availability/availability-domain.test.ts
```

Expected: FAIL because `./availability-domain` does not exist.

- [ ] **Step 3: Implement the domain types, validation, and resolver**

Create `src/features/availability/availability-domain.ts` with these public contracts and algorithms:

```ts
import { z } from "zod";

export const ATELIER_TIMEZONE = "Asia/Jerusalem" as const;
export const SLOT_DURATION_MINUTES = 60 as const;
export const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof weekdays)[number];
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type AvailabilityWindow = { id?: string; startsAt: string; endsAt: string };
export type WeeklyAvailabilityDay = {
  weekday: Weekday;
  isEnabled: boolean;
  windows: AvailabilityWindow[];
};
export type AvailabilityOverride = {
  id: string;
  kind: "closed" | "custom-hours";
  startsOn: string;
  endsOn: string;
  note: string;
  windows: AvailabilityWindow[];
};
export type AvailabilityConfiguration = {
  timezone: typeof ATELIER_TIMEZONE;
  slotDurationMinutes: typeof SLOT_DURATION_MINUTES;
  weekly: WeeklyAvailabilityDay[];
  overrides: AvailabilityOverride[];
};
export type WeeklyScheduleInput = { days: WeeklyAvailabilityDay[] };
export type AvailabilityOverrideInput = Omit<AvailabilityOverride, "id"> & { id?: string };
export type OccupiedAppointment = {
  id: string;
  date: string;
  startsAt: string;
  status: AppointmentStatus;
};
export type AvailableSlot = { startsAt: string; endsAt: string };
export type ParseResult<T> =
  { success: true; data: T } | { success: false; fieldErrors: Record<string, string> };

const timePattern = /^([01]\d|2[0-3]):(00|30)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const windowSchema = z.object({
  id: z.string().uuid().optional(),
  startsAt: z.string().regex(timePattern, "Use a 30-minute time boundary."),
  endsAt: z.string().regex(timePattern, "Use a 30-minute time boundary."),
});
const daySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  isEnabled: z.boolean(),
  windows: z.array(windowSchema),
});

function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function timeFromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function validateWindows(windows: AvailabilityWindow[], prefix: string) {
  const fieldErrors: Record<string, string> = {};
  const ordered = [...windows].sort((a, b) => minutes(a.startsAt) - minutes(b.startsAt));
  ordered.forEach((window, index) => {
    const duration = minutes(window.endsAt) - minutes(window.startsAt);
    if (duration < SLOT_DURATION_MINUTES) {
      fieldErrors[`${prefix}.${index}`] = "A window must be at least 60 minutes.";
    } else if (duration % SLOT_DURATION_MINUTES !== 0) {
      fieldErrors[`${prefix}.${index}`] = "A window must contain complete 60-minute slots.";
    }
    if (index > 0 && minutes(ordered[index - 1].endsAt) > minutes(window.startsAt)) {
      fieldErrors[`${prefix}.${index}`] = "Availability windows cannot overlap.";
    }
  });
  return fieldErrors;
}

export const DEFAULT_WEEKLY_SCHEDULE: WeeklyAvailabilityDay[] = weekdays.map((weekday) => ({
  weekday,
  isEnabled: weekday !== 4,
  windows: [{ startsAt: "11:00", endsAt: "17:00" }],
}));

export function parseWeeklySchedule(input: unknown): ParseResult<WeeklyScheduleInput> {
  const parsed = z.object({ days: z.array(daySchema).length(7) }).safeParse(input);
  if (!parsed.success)
    return { success: false, fieldErrors: { schedule: "Configure all seven days." } };
  const uniqueDays = new Set(parsed.data.days.map((day) => day.weekday));
  const fieldErrors: Record<string, string> = {};
  if (uniqueDays.size !== 7) fieldErrors.schedule = "Each weekday must appear once.";
  for (const day of parsed.data.days) {
    if (day.isEnabled && day.windows.length === 0) {
      fieldErrors[`days.${day.weekday}.windows`] = "An open day needs at least one window.";
    }
    Object.assign(fieldErrors, validateWindows(day.windows, `days.${day.weekday}.windows`));
  }
  return Object.keys(fieldErrors).length
    ? { success: false, fieldErrors }
    : { success: true, data: parsed.data as WeeklyScheduleInput };
}

export function parseAvailabilityOverride(input: unknown): ParseResult<AvailabilityOverrideInput> {
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      kind: z.enum(["closed", "custom-hours"]),
      startsOn: z.string().regex(datePattern),
      endsOn: z.string().regex(datePattern),
      note: z.string().trim().max(240),
      windows: z.array(windowSchema),
    })
    .safeParse(input);
  if (!parsed.success)
    return { success: false, fieldErrors: { override: "Enter a valid exception." } };
  const fieldErrors: Record<string, string> = {};
  if (parsed.data.endsOn < parsed.data.startsOn)
    fieldErrors.endsOn = "End date cannot precede start date.";
  if (parsed.data.kind === "custom-hours" && parsed.data.startsOn !== parsed.data.endsOn) {
    fieldErrors.endsOn = "Custom hours apply to one date.";
  }
  if (parsed.data.kind === "closed" && parsed.data.windows.length) {
    fieldErrors.windows = "A closure cannot contain working hours.";
  }
  if (parsed.data.kind === "custom-hours" && parsed.data.windows.length === 0) {
    fieldErrors.windows = "Custom hours need at least one window.";
  }
  Object.assign(fieldErrors, validateWindows(parsed.data.windows, "windows"));
  return Object.keys(fieldErrors).length
    ? { success: false, fieldErrors }
    : { success: true, data: parsed.data };
}

export function getLocalDateInTimeZone(now = new Date(), timezone = ATELIER_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addMinutes(time: string, amount: number) {
  return timeFromMinutes(minutes(time) + amount);
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return minutes(startA) < minutes(endB) && minutes(endA) > minutes(startB);
}

function effectiveWindows(configuration: AvailabilityConfiguration, date: string) {
  const override = configuration.overrides.find(
    (item) => item.startsOn <= date && item.endsOn >= date,
  );
  if (override?.kind === "closed") return [];
  if (override?.kind === "custom-hours") return override.windows;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() as Weekday;
  const day = configuration.weekly.find((item) => item.weekday === weekday);
  return day?.isEnabled ? day.windows : [];
}

export function resolveAvailableSlots(
  configuration: AvailabilityConfiguration,
  date: string,
  appointments: OccupiedAppointment[],
  now = new Date(),
): AvailableSlot[] {
  if (date < getLocalDateInTimeZone(now, configuration.timezone)) return [];
  const occupied = appointments.filter((item) => item.date === date && item.status !== "cancelled");
  return effectiveWindows(configuration, date).flatMap((window) => {
    const slots: AvailableSlot[] = [];
    for (
      let start = minutes(window.startsAt);
      start + configuration.slotDurationMinutes <= minutes(window.endsAt);
      start += configuration.slotDurationMinutes
    ) {
      const startsAt = timeFromMinutes(start);
      const endsAt = addMinutes(startsAt, configuration.slotDurationMinutes);
      if (
        !occupied.some((item) =>
          overlaps(
            startsAt,
            endsAt,
            item.startsAt,
            addMinutes(item.startsAt, SLOT_DURATION_MINUTES),
          ),
        )
      ) {
        slots.push({ startsAt, endsAt });
      }
    }
    return slots;
  });
}

export function isAppointmentInsideSchedule(
  configuration: AvailabilityConfiguration,
  appointment: OccupiedAppointment,
  now = new Date(),
) {
  if (appointment.status === "cancelled") return true;
  return (
    effectiveWindows(configuration, appointment.date).some(
      (window) =>
        minutes(appointment.startsAt) >= minutes(window.startsAt) &&
        minutes(appointment.startsAt) + SLOT_DURATION_MINUTES <= minutes(window.endsAt) &&
        (minutes(appointment.startsAt) - minutes(window.startsAt)) % SLOT_DURATION_MINUTES === 0,
    ) && appointment.date >= getLocalDateInTimeZone(now, configuration.timezone)
  );
}

export function findScheduleConflicts(
  current: AvailabilityConfiguration,
  candidate: AvailabilityConfiguration,
  appointments: OccupiedAppointment[],
  now = new Date(),
) {
  return appointments.filter(
    (appointment) =>
      isAppointmentInsideSchedule(current, appointment, now) &&
      !isAppointmentInsideSchedule(candidate, appointment, now),
  );
}

export function listMonthDates(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from(
    { length: count },
    (_, index) =>
      `${year}-${String(monthNumber).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
  );
}
```

- [ ] **Step 4: Run the domain tests**

Run:

```powershell
npx vitest run src/features/availability/availability-domain.test.ts
```

Expected: PASS with all domain cases green.

- [ ] **Step 5: Commit the domain**

```powershell
git add src/features/availability/availability-domain.ts src/features/availability/availability-domain.test.ts
git commit -m "feat: resolve recurring and exceptional availability"
```

---

### Task 3: Persist and Read Availability Through a Neon Repository

**Files:**

- Create: `src/features/availability/availability-repository.server.ts`
- Create: `src/features/availability/availability-repository.server.test.ts`

**Interfaces:**

- Consumes: domain types from Task 2 and the five tables from Task 1.
- Produces: `AvailabilityRepository`, `createAvailabilityRepository(execute)`, `getNeonAvailabilityRepository()`, and `AvailabilityQueryExecutor`.

- [ ] **Step 1: Write failing repository tests**

Create `src/features/availability/availability-repository.server.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_WEEKLY_SCHEDULE } from "./availability-domain";
import {
  createAvailabilityRepository,
  type AvailabilityQueryExecutor,
} from "./availability-repository.server";

const configurationRow = {
  timezone: "Asia/Jerusalem",
  slot_duration_minutes: 60,
  weekly: DEFAULT_WEEKLY_SCHEDULE,
  overrides: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      kind: "closed",
      startsOn: "2026-08-10",
      endsOn: "2026-08-20",
      note: "Travel",
      windows: [],
    },
  ],
};

describe("availability repository", () => {
  it("loads one normalized configuration", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([configurationRow]);
    await expect(createAvailabilityRepository(execute).loadConfiguration()).resolves.toEqual({
      timezone: "Asia/Jerusalem",
      slotDurationMinutes: 60,
      weekly: DEFAULT_WEEKLY_SCHEDULE,
      overrides: configurationRow.overrides,
    });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("weekly_availability_days"));
  });

  it("lists active occupied appointments in an inclusive range", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([
      {
        id: "appointment-1",
        appointment_date: "2026-07-19",
        appointment_time: "12:30",
        status: "confirmed",
      },
    ]);
    await expect(
      createAvailabilityRepository(execute).listOccupiedAppointments("2026-07-01", "2026-07-31"),
    ).resolves.toEqual([
      {
        id: "appointment-1",
        date: "2026-07-19",
        startsAt: "12:30",
        status: "confirmed",
      },
    ]);
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("status <> 'cancelled'"), [
      "2026-07-01",
      "2026-07-31",
    ]);
  });

  it("replaces all seven weekly days and windows in one statement", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([]);
    await createAvailabilityRepository(execute).replaceWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(
      expect.stringMatching(
        /UPDATE public\.weekly_availability_days[\s\S]+DELETE FROM public\.weekly_availability_windows[\s\S]+INSERT INTO public\.weekly_availability_windows/,
      ),
      [JSON.stringify(DEFAULT_WEEKLY_SCHEDULE)],
    );
  });

  it("upserts an override and its windows in one statement", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
      },
    ]);
    const input = {
      kind: "custom-hours" as const,
      startsOn: "2026-07-16",
      endsOn: "2026-07-16",
      note: "Thursday opening",
      windows: [{ startsAt: "11:30", endsAt: "13:30" }],
    };
    await expect(createAvailabilityRepository(execute).saveOverride(input)).resolves.toEqual({
      success: true,
      id: "11111111-1111-4111-8111-111111111111",
    });
    expect(execute).toHaveBeenCalledWith(
      expect.stringMatching(/availability_date_overrides[\s\S]+availability_date_windows/),
      [
        null,
        "custom-hours",
        "2026-07-16",
        "2026-07-16",
        "Thursday opening",
        JSON.stringify(input.windows),
      ],
    );
  });

  it("maps a concurrent override-range conflict", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockRejectedValue({
      code: "23P01",
      constraint: "availability_date_overrides_no_overlap",
    });
    await expect(
      createAvailabilityRepository(execute).saveOverride({
        kind: "closed",
        startsOn: "2026-08-10",
        endsOn: "2026-08-20",
        note: "Travel",
        windows: [],
      }),
    ).resolves.toEqual({ success: false, reason: "overlap" });
  });

  it("deletes an override without touching appointments", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([{ id: "override-1" }]);
    await expect(createAvailabilityRepository(execute).deleteOverride("override-1")).resolves.toBe(
      true,
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM public\.availability_date_overrides/),
      ["override-1"],
    );
  });
});
```

- [ ] **Step 2: Run the repository test and observe the missing-module failure**

Run:

```powershell
npx vitest run src/features/availability/availability-repository.server.test.ts
```

Expected: FAIL because `./availability-repository.server` does not exist.

- [ ] **Step 3: Implement the repository contract and queries**

Create `src/features/availability/availability-repository.server.ts` with the following public boundary:

```ts
import { neon } from "@neondatabase/serverless";
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

export type SaveOverrideResult =
  { success: true; id: string } | { success: false; reason: "overlap" };

export type AvailabilityRepository = {
  loadConfiguration(): Promise<AvailabilityConfiguration>;
  listOccupiedAppointments(startsOn: string, endsOn: string): Promise<OccupiedAppointment[]>;
  replaceWeeklySchedule(days: WeeklyAvailabilityDay[]): Promise<void>;
  saveOverride(input: AvailabilityOverrideInput): Promise<SaveOverrideResult>;
  deleteOverride(id: string): Promise<boolean>;
};
```

Use one aggregate query for `loadConfiguration()`. It must return JSON keys matching the domain types exactly:

```sql
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
WHERE settings.singleton = true
```

Map the row with:

```ts
return {
  timezone: row.timezone,
  slotDurationMinutes: row.slot_duration_minutes,
  weekly: row.weekly,
  overrides: row.overrides,
};
```

Use this occupied-appointment query and map snake case to the domain names:

```sql
SELECT
  id,
  appointment_date::text,
  to_char(appointment_time, 'HH24:MI') AS appointment_time,
  status
FROM public.appointments
WHERE appointment_date BETWEEN $1::date AND $2::date
  AND status <> 'cancelled'
ORDER BY appointment_date, appointment_time
```

Use a single data-modifying statement for `replaceWeeklySchedule(days)`, passing `[JSON.stringify(days)]`:

```sql
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
WHERE (SELECT count(*) FROM deleted_windows) >= 0
```

Use one statement for `saveOverride(input)`, passing `[input.id ?? null, input.kind, input.startsOn, input.endsOn, input.note, JSON.stringify(input.windows)]`:

```sql
WITH removed_windows AS (
  DELETE FROM public.availability_date_windows
  WHERE override_id = $1::uuid
  RETURNING id
),
saved_override AS (
  INSERT INTO public.availability_date_overrides (id, kind, starts_on, ends_on, note)
  VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3::date, $4::date, $5)
  ON CONFLICT (id) DO UPDATE
    SET kind = EXCLUDED.kind,
        starts_on = EXCLUDED.starts_on,
        ends_on = EXCLUDED.ends_on,
        note = EXCLUDED.note,
        updated_at = now()
  RETURNING id
),
saved_windows AS (
  INSERT INTO public.availability_date_windows (override_id, starts_at, ends_at, sort_order)
  SELECT
    saved_override.id,
    (window.value->>'startsAt')::time,
    (window.value->>'endsAt')::time,
    (window.ordinality - 1)::smallint
  FROM saved_override
  CROSS JOIN LATERAL jsonb_array_elements($6::jsonb)
    WITH ORDINALITY AS window(value, ordinality)
  WHERE (SELECT count(*) FROM removed_windows) >= 0
  RETURNING id
)
SELECT id FROM saved_override
```

Map only error `{ code: "23P01", constraint: "availability_date_overrides_no_overlap" }` to `{ success: false, reason: "overlap" }`; rethrow every other error. Implement deletion as:

```sql
DELETE FROM public.availability_date_overrides
WHERE id = $1::uuid
RETURNING id
```

Create the Neon-backed factory using the same `DATABASE_URL` guard and `sql.query(query, params)` pattern as `booking-repository.server.ts`.

- [ ] **Step 4: Name the database exclusions used by repository error translation**

In `db/migrations/004_create_availability_tables.sql`, name the three constraints exactly:

```sql
CONSTRAINT weekly_availability_windows_no_overlap EXCLUDE USING gist (
  weekday WITH =,
  tsrange(date '2000-01-01' + starts_at, date '2000-01-01' + ends_at, '[)') WITH &&
)

CONSTRAINT availability_date_overrides_no_overlap
  EXCLUDE USING gist (daterange(starts_on, ends_on, '[]') WITH &&)

CONSTRAINT availability_date_windows_no_overlap EXCLUDE USING gist (
  override_id WITH =,
  tsrange(date '2000-01-01' + starts_at, date '2000-01-01' + ends_at, '[)') WITH &&
)
```

- [ ] **Step 5: Run repository, migration, and domain tests**

Run:

```powershell
npx vitest run src/features/availability/availability-migration.test.ts src/features/availability/availability-domain.test.ts src/features/availability/availability-repository.server.test.ts
```

Expected: all three test files pass.

- [ ] **Step 6: Commit the repository**

```powershell
git add db/migrations/004_create_availability_tables.sql src/features/availability/availability-repository.server.ts src/features/availability/availability-repository.server.test.ts
git commit -m "feat: persist availability rules in Neon"
```

---

### Task 4: Add Public and Authenticated Availability Services

**Files:**

- Modify: `src/features/availability/availability-domain.ts`
- Modify: `src/features/availability/availability-domain.test.ts`
- Create: `src/features/availability/availability-service.ts`
- Create: `src/features/availability/availability-service.test.ts`
- Create: `src/features/availability/availability.functions.ts`

**Interfaces:**

- Consumes: `AvailabilityRepository`, `verifyAdminToken`, and Task 2 domain functions.
- Produces: public month/day queries and authenticated load/save/delete operations with validation and conflict-confirmation results.

- [ ] **Step 1: Write failing domain tests for immutable draft changes**

Append to `availability-domain.test.ts` and add the four functions to its import list:

```ts
it("applies weekly and override drafts without mutating loaded data", () => {
  const weeklyDraft = configuration.weekly.map((day) =>
    day.weekday === 0 ? { ...day, isEnabled: false } : day,
  );
  expect(applyWeeklySchedule(configuration, weeklyDraft).weekly[0].isEnabled).toBe(false);
  expect(configuration.weekly[0].isEnabled).toBe(true);

  const changed = applyOverride(configuration, {
    kind: "closed",
    startsOn: "2026-08-10",
    endsOn: "2026-08-20",
    note: "Travel",
    windows: [],
  });
  expect(changed.overrides).toHaveLength(1);
  expect(removeOverride(changed, "draft-override").overrides).toEqual([]);
});

it("detects overlapping overrides while allowing a row to replace itself", () => {
  const existing = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      kind: "closed" as const,
      startsOn: "2026-08-10",
      endsOn: "2026-08-20",
      note: "Travel",
      windows: [],
    },
  ];
  expect(
    hasOverrideOverlap(
      {
        kind: "closed",
        startsOn: "2026-08-15",
        endsOn: "2026-08-22",
        note: "",
        windows: [],
      },
      existing,
    ),
  ).toBe(true);
  expect(hasOverrideOverlap({ ...existing[0], endsOn: "2026-08-21" }, existing)).toBe(false);
});
```

- [ ] **Step 2: Run the domain test and observe missing exports**

Run:

```powershell
npx vitest run src/features/availability/availability-domain.test.ts
```

Expected: FAIL because `applyWeeklySchedule`, `applyOverride`, `removeOverride`, and `hasOverrideOverlap` are not exported.

- [ ] **Step 3: Add the immutable domain helpers**

Append to `availability-domain.ts`:

```ts
export function applyWeeklySchedule(
  configuration: AvailabilityConfiguration,
  weekly: WeeklyAvailabilityDay[],
): AvailabilityConfiguration {
  return { ...configuration, weekly: structuredClone(weekly) };
}

export function applyOverride(
  configuration: AvailabilityConfiguration,
  input: AvailabilityOverrideInput,
): AvailabilityConfiguration {
  const id = input.id ?? "draft-override";
  const next: AvailabilityOverride = { ...input, id };
  return {
    ...configuration,
    overrides: [...configuration.overrides.filter((item) => item.id !== id), next].sort((a, b) =>
      a.startsOn.localeCompare(b.startsOn),
    ),
  };
}

export function removeOverride(configuration: AvailabilityConfiguration, id: string) {
  return { ...configuration, overrides: configuration.overrides.filter((item) => item.id !== id) };
}

export function hasOverrideOverlap(
  input: AvailabilityOverrideInput,
  existing: AvailabilityOverride[],
) {
  return existing.some(
    (item) =>
      item.id !== input.id && input.startsOn <= item.endsOn && input.endsOn >= item.startsOn,
  );
}
```

- [ ] **Step 4: Write failing public/admin service tests**

Create `availability-service.test.ts` with this dependency factory and cases:

```ts
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_WEEKLY_SCHEDULE, type AvailabilityConfiguration } from "./availability-domain";
import {
  deleteOverrideForAdmin,
  getOpenDatesForMonth,
  getSlotsForDate,
  loadAvailabilityForAdmin,
  saveOverrideForAdmin,
  saveWeeklyScheduleForAdmin,
} from "./availability-service";

const configuration: AvailabilityConfiguration = {
  timezone: "Asia/Jerusalem",
  slotDurationMinutes: 60,
  weekly: DEFAULT_WEEKLY_SCHEDULE,
  overrides: [],
};

function dependencies(allowed = true) {
  return {
    verifyAdminToken: vi.fn().mockResolvedValue({ allowed }),
    now: () => new Date("2026-07-15T09:00:00Z"),
    repository: {
      loadConfiguration: vi.fn().mockResolvedValue(configuration),
      listOccupiedAppointments: vi.fn().mockResolvedValue([]),
      replaceWeeklySchedule: vi.fn().mockResolvedValue(undefined),
      saveOverride: vi.fn().mockResolvedValue({ success: true, id: "override-1" }),
      deleteOverride: vi.fn().mockResolvedValue(true),
    },
  };
}

describe("availability service", () => {
  it("returns narrow public open-date and slot projections", async () => {
    const deps = dependencies();
    const month = await getOpenDatesForMonth("2026-07", deps.repository, deps.now());
    expect(month).toMatchObject({
      success: true,
      openDates: expect.arrayContaining(["2026-07-19"]),
    });
    if (month.success) expect(month.openDates).not.toContain("2026-07-16");
    await expect(getSlotsForDate("2026-07-19", deps.repository, deps.now())).resolves.toMatchObject(
      {
        success: true,
        slots: [{ startsAt: "11:00", endsAt: "12:00" }],
      },
    );
  });

  it("rejects forbidden admin access before repository resolution", async () => {
    const deps = dependencies(false);
    await expect(loadAvailabilityForAdmin("bad-token", deps)).resolves.toEqual({
      success: false,
      reason: "forbidden",
    });
    expect(deps.repository.loadConfiguration).not.toHaveBeenCalled();
  });

  it("requires confirmation but never deletes conflicting bookings", async () => {
    const deps = dependencies();
    deps.repository.listOccupiedAppointments.mockResolvedValue([
      { id: "appointment-1", date: "2026-07-19", startsAt: "11:00", status: "confirmed" },
    ]);
    const days = DEFAULT_WEEKLY_SCHEDULE.map((day) =>
      day.weekday === 0 ? { ...day, isEnabled: false } : day,
    );
    await expect(
      saveWeeklyScheduleForAdmin(
        {
          token: "admin-token",
          input: { days },
          confirmConflicts: false,
        },
        deps,
      ),
    ).resolves.toMatchObject({ success: false, reason: "conflicts" });
    expect(deps.repository.replaceWeeklySchedule).not.toHaveBeenCalled();
    await saveWeeklyScheduleForAdmin(
      {
        token: "admin-token",
        input: { days },
        confirmConflicts: true,
      },
      deps,
    );
    expect(deps.repository.replaceWeeklySchedule).toHaveBeenCalledWith(days);
    expect(deps.repository.deleteOverride).not.toHaveBeenCalled();
  });

  it("saves an inclusive travel closure after validation", async () => {
    const deps = dependencies();
    const input = {
      kind: "closed" as const,
      startsOn: "2026-08-10",
      endsOn: "2026-08-20",
      note: "Travel",
      windows: [],
    };
    await expect(
      saveOverrideForAdmin(
        {
          token: "admin-token",
          input,
          confirmConflicts: true,
        },
        deps,
      ),
    ).resolves.toMatchObject({ success: true });
    expect(deps.repository.saveOverride).toHaveBeenCalledWith(input);
  });

  it("previews conflicts before deleting a custom-hours override", async () => {
    const deps = dependencies();
    const stored = {
      id: "11111111-1111-4111-8111-111111111111",
      kind: "custom-hours" as const,
      startsOn: "2026-07-16",
      endsOn: "2026-07-16",
      note: "Thursday opening",
      windows: [{ startsAt: "11:00", endsAt: "13:00" }],
    };
    deps.repository.loadConfiguration.mockResolvedValue({ ...configuration, overrides: [stored] });
    deps.repository.listOccupiedAppointments.mockResolvedValue([
      { id: "appointment-1", date: "2026-07-16", startsAt: "11:00", status: "confirmed" },
    ]);
    await expect(
      deleteOverrideForAdmin(
        {
          token: "admin-token",
          id: stored.id,
          confirmConflicts: false,
        },
        deps,
      ),
    ).resolves.toMatchObject({ success: false, reason: "conflicts" });
    expect(deps.repository.deleteOverride).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run the service test and observe the missing module**

Run:

```powershell
npx vitest run src/features/availability/availability-service.test.ts
```

Expected: FAIL because `availability-service.ts` does not exist.

- [ ] **Step 6: Implement the service boundary**

Create `availability-service.ts` with these exact exported result types:

```ts
export type AvailabilityAdminDependencies = {
  verifyAdminToken: typeof verifyAdminToken;
  now: () => Date;
} & (
  | { repository: AvailabilityRepository; getRepository?: never }
  | { repository?: never; getRepository: () => AvailabilityRepository }
);

export type AvailabilityMutationResult =
  | { success: true; configuration: AvailabilityConfiguration }
  | { success: false; reason: "forbidden" | "storage-error" | "not-found" | "overlap" }
  | { success: false; reason: "validation"; fieldErrors: Record<string, string> }
  | { success: false; reason: "conflicts"; conflicts: OccupiedAppointment[] };
```

Implement the public functions using the shared resolver:

```ts
export async function getSlotsForDate(
  date: string,
  repository: AvailabilityRepository,
  now = new Date(),
) {
  try {
    const [configuration, appointments] = await Promise.all([
      repository.loadConfiguration(),
      repository.listOccupiedAppointments(date, date),
    ]);
    return {
      success: true as const,
      slots: resolveAvailableSlots(configuration, date, appointments, now),
    };
  } catch {
    return { success: false as const, reason: "load-error" as const };
  }
}

export async function getOpenDatesForMonth(
  month: string,
  repository: AvailabilityRepository,
  now = new Date(),
) {
  try {
    const dates = listMonthDates(month);
    const [configuration, appointments] = await Promise.all([
      repository.loadConfiguration(),
      repository.listOccupiedAppointments(dates[0], dates.at(-1) as string),
    ]);
    return {
      success: true as const,
      openDates: dates.filter(
        (date) => resolveAvailableSlots(configuration, date, appointments, now).length,
      ),
    };
  } catch {
    return { success: false as const, reason: "load-error" as const };
  }
}
```

For each admin operation:

1. Call `verifyAdminToken(token)` and return `forbidden` before touching the repository when it throws or returns `{ allowed: false }`.
2. Resolve the repository only after authorization with `dependencies.repository ?? dependencies.getRepository()`.
3. Parse input with `parseWeeklySchedule` or `parseAvailabilityOverride`.
4. Load the current configuration and active appointments from the Palestine local date through `9999-12-31`.
5. Build a candidate with `applyWeeklySchedule`, `applyOverride`, or `removeOverride`.
6. Call `findScheduleConflicts(current, candidate, appointments, now)` so legacy bookings already outside the old schedule do not produce unrelated warnings.
7. Return `{ success: false, reason: "conflicts", conflicts }` unless `confirmConflicts` is true.
8. Persist through the repository, reload configuration, and return it.
9. Map repository override overlap to `overlap`, missing deletion to `not-found`, and unexpected errors to `storage-error`.

The exported function signatures are:

```ts
export function loadAvailabilityForAdmin(
  token: string,
  dependencies: AvailabilityAdminDependencies,
): Promise<
  | { success: true; configuration: AvailabilityConfiguration }
  | { success: false; reason: "forbidden" | "load-error" }
>;

export function saveWeeklyScheduleForAdmin(
  request: { token: string; input: unknown; confirmConflicts: boolean },
  dependencies: AvailabilityAdminDependencies,
): Promise<AvailabilityMutationResult>;

export function saveOverrideForAdmin(
  request: { token: string; input: unknown; confirmConflicts: boolean },
  dependencies: AvailabilityAdminDependencies,
): Promise<AvailabilityMutationResult>;

export function deleteOverrideForAdmin(
  request: { token: string; id: string; confirmConflicts: boolean },
  dependencies: AvailabilityAdminDependencies,
): Promise<AvailabilityMutationResult>;
```

- [ ] **Step 7: Add TanStack server-function adapters**

Create `availability.functions.ts` with six adapters:

```ts
const repository = () => getNeonAvailabilityRepository();
const adminDependencies = () => ({
  verifyAdminToken,
  getRepository: repository,
  now: () => new Date(),
});

export const getPublicAvailabilityMonth = createServerFn({ method: "GET" })
  .validator(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
  .handler(({ data }) => getOpenDatesForMonth(data.month, repository()));

export const getPublicAvailabilityDay = createServerFn({ method: "GET" })
  .validator(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(({ data }) => getSlotsForDate(data.date, repository()));

export const getAdminAvailability = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(({ data }) => loadAvailabilityForAdmin(data.token, adminDependencies()));

export const saveAdminWeeklySchedule = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string().min(1), input: z.unknown(), confirmConflicts: z.boolean() }),
  )
  .handler(({ data }) => saveWeeklyScheduleForAdmin(data, adminDependencies()));

export const saveAdminAvailabilityOverride = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string().min(1), input: z.unknown(), confirmConflicts: z.boolean() }),
  )
  .handler(({ data }) => saveOverrideForAdmin(data, adminDependencies()));

export const deleteAdminAvailabilityOverride = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string().min(1), id: z.string().uuid(), confirmConflicts: z.boolean() }),
  )
  .handler(({ data }) => deleteOverrideForAdmin(data, adminDependencies()));
```

Import `createServerFn`, `z`, `verifyAdminToken`, repository factory, and the six service functions explicitly.

- [ ] **Step 8: Run all server-side availability tests**

Run:

```powershell
npx vitest run src/features/availability/availability-domain.test.ts src/features/availability/availability-repository.server.test.ts src/features/availability/availability-service.test.ts
```

Expected: all tests pass with no unhandled console output.

- [ ] **Step 9: Commit the service boundary**

```powershell
git add src/features/availability/availability-domain.ts src/features/availability/availability-domain.test.ts src/features/availability/availability-service.ts src/features/availability/availability-service.test.ts src/features/availability/availability.functions.ts
git commit -m "feat: expose public and admin availability services"
```

---

### Task 5: Make Booking Submission Revalidate Persisted Availability

**Files:**

- Modify: `src/features/book-call/booking-domain.ts`
- Modify: `src/features/book-call/booking-domain.test.ts`
- Modify: `src/features/book-call/booking-service.ts`
- Modify: `src/features/book-call/booking-service.test.ts`
- Modify: `src/features/book-call/booking.functions.ts`
- Modify: `src/features/book-call/booking-repository.server.ts`
- Modify: `src/features/book-call/booking-repository.server.test.ts`

**Interfaces:**

- Consumes: `getSlotsForDate` and `getNeonAvailabilityRepository()` from Tasks 3-4.
- Produces: `submitBookingRequest(input, bookingRepository, availabilityRepository, now?)` that writes only a currently available slot.

- [ ] **Step 1: Write a failing schedule-independent booking-domain test**

In `booking-domain.test.ts`, replace tests tied to `timesByDay` with:

```ts
it("accepts a well-formed date and time for authoritative availability validation", () => {
  expect(
    parseBookingInput({
      ...validInput,
      appointmentDate: "2026-07-16",
      appointmentTime: "11:30",
    }),
  ).toMatchObject({
    success: true,
    data: { appointmentDate: "2026-07-16", appointmentTime: "11:30" },
  });
});
```

Keep malformed date/time, appointment type, mobile normalization, name length, and notes length tests.

- [ ] **Step 2: Run the domain test and observe the hard-coded schedule failure**

Run:

```powershell
npx vitest run src/features/book-call/booking-domain.test.ts
```

Expected: FAIL because the current Thursday/time membership check rejects `2026-07-16 11:30`.

- [ ] **Step 3: Remove hard-coded scheduling from input parsing**

Delete `timesByDay`, `AppointmentDay`, and `getAppointmentDay` from `booking-domain.ts`. Keep the `YYYY-MM-DD` and `HH:MM` Zod shape checks, and delete only this availability-membership block:

```ts
const day = getAppointmentDay(data.appointmentDate);
if (!day) {
  fieldErrors.appointmentDate = "Choose an available appointment day.";
} else if (!timesByDay[day].includes(data.appointmentTime as never)) {
  fieldErrors.appointmentTime = "Choose an available appointment time.";
}
```

Run the domain test again. Expected: PASS.

- [ ] **Step 4: Write failing booking-service tests for closed and available slots**

At the top of `booking-service.test.ts`, hoist and mock the shared availability read:

```ts
const { getSlotsForDate } = vi.hoisted(() => ({ getSlotsForDate: vi.fn() }));

vi.mock("@/features/availability/availability-service", () => ({ getSlotsForDate }));

import type { AvailabilityRepository } from "@/features/availability/availability-repository.server";
```

Define `const availabilityRepository = {} as AvailabilityRepository;`. Reset the mock before each test and default it to the valid input's slot:

```ts
beforeEach(() => {
  getSlotsForDate.mockReset();
  getSlotsForDate.mockResolvedValue({
    success: true,
    slots: [{ startsAt: validInput.appointmentTime, endsAt: "11:00" }],
  });
});
```

Update existing calls to pass `availabilityRepository`, then add:

```ts
it("does not insert a closed or stale slot", async () => {
  const create = vi.fn();
  getSlotsForDate.mockResolvedValueOnce({ success: true, slots: [] });
  await expect(
    submitBookingRequest(
      validInput,
      { create },
      availabilityRepository,
      new Date("2026-07-01T09:00:00Z"),
    ),
  ).resolves.toEqual({ success: false, reason: "slot-unavailable" });
  expect(create).not.toHaveBeenCalled();
});

it("does not insert when canonical availability cannot be loaded", async () => {
  const create = vi.fn();
  getSlotsForDate.mockResolvedValueOnce({ success: false, reason: "load-error" });
  await expect(
    submitBookingRequest(validInput, { create }, availabilityRepository),
  ).resolves.toEqual({ success: false, reason: "storage-error" });
  expect(create).not.toHaveBeenCalled();
});

it("inserts after the canonical resolver returns the requested slot", async () => {
  const create = vi.fn().mockResolvedValue({ success: true, appointmentId: "appointment-1" });
  await expect(
    submitBookingRequest(validInput, { create }, availabilityRepository),
  ).resolves.toEqual({ success: true, appointmentId: "appointment-1" });
  expect(getSlotsForDate).toHaveBeenCalledWith(
    validInput.appointmentDate,
    availabilityRepository,
    expect.any(Date),
  );
  expect(create).toHaveBeenCalledOnce();
});
```

- [ ] **Step 5: Run the service test and observe the signature failure**

Run:

```powershell
npx vitest run src/features/book-call/booking-service.test.ts
```

Expected: FAIL because `submitBookingRequest` does not accept or consult an availability repository.

- [ ] **Step 6: Revalidate before creating the booking**

Replace `booking-service.ts` with:

```ts
import type { AvailabilityRepository } from "@/features/availability/availability-repository.server";
import { getSlotsForDate } from "@/features/availability/availability-service";
import type { BookingInput } from "./booking-domain";
import { parseBookingInput } from "./booking-domain";
import type { BookingRepository } from "./booking-repository.server";

export type BookingSubmissionResult =
  | { success: true; appointmentId: string }
  | { success: false; reason: "validation"; fieldErrors: Record<string, string | undefined> }
  | { success: false; reason: "slot-unavailable" | "storage-error" };

export async function submitBookingRequest(
  input: BookingInput,
  bookingRepository: Pick<BookingRepository, "create">,
  availabilityRepository: AvailabilityRepository,
  now = new Date(),
): Promise<BookingSubmissionResult> {
  const parsed = parseBookingInput(input);
  if (!parsed.success) {
    return { success: false, reason: "validation", fieldErrors: parsed.fieldErrors };
  }

  const availability = await getSlotsForDate(
    parsed.data.appointmentDate,
    availabilityRepository,
    now,
  );
  if (!availability.success) return { success: false, reason: "storage-error" };
  if (!availability.slots.some((slot) => slot.startsAt === parsed.data.appointmentTime)) {
    return { success: false, reason: "slot-unavailable" };
  }

  try {
    return await bookingRepository.create(parsed.data);
  } catch (error) {
    console.error(error);
    return { success: false, reason: "storage-error" };
  }
}
```

- [ ] **Step 7: Inject both Neon repositories in the server function**

Replace `booking.functions.ts` with:

```ts
import { createServerFn } from "@tanstack/react-start";
import { getNeonAvailabilityRepository } from "@/features/availability/availability-repository.server";
import type { BookingInput } from "./booking-domain";
import { getNeonBookingRepository } from "./booking-repository.server";
import { submitBookingRequest } from "./booking-service";

export const submitBooking = createServerFn({ method: "POST" })
  .validator((data: BookingInput) => data)
  .handler(({ data }) =>
    submitBookingRequest(data, getNeonBookingRepository(), getNeonAvailabilityRepository()),
  );
```

- [ ] **Step 8: Write the failing overlap-constraint repository test**

Append to `booking-repository.server.test.ts`, using that file's existing valid booking fixture:

```ts
it("maps the 60-minute overlap exclusion constraint", async () => {
  const execute = vi.fn<QueryExecutor>().mockRejectedValue({
    code: "23P01",
    constraint: "appointments_active_time_overlap",
  });
  await expect(createBookingRepository(execute).create(validBooking)).resolves.toEqual({
    success: false,
    reason: "slot-unavailable",
  });
});
```

- [ ] **Step 9: Run the repository test and observe the raw rejection**

Run:

```powershell
npx vitest run src/features/book-call/booking-repository.server.test.ts
```

Expected: FAIL because `23P01` is not translated.

- [ ] **Step 10: Translate exact-start and range-overlap conflicts**

Replace `isActiveSlotConflict` in `booking-repository.server.ts`:

```ts
function isActiveSlotConflict(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  if (error.code === "23505" && "constraint" in error) {
    return error.constraint === "appointments_active_slot_unique";
  }
  if (error.code === "23P01" && "constraint" in error) {
    return error.constraint === "appointments_active_time_overlap";
  }
  return false;
}
```

- [ ] **Step 11: Run all booking feature tests**

Run:

```powershell
npx vitest run src/features/book-call/booking-domain.test.ts src/features/book-call/booking-service.test.ts src/features/book-call/booking-repository.server.test.ts
```

Expected: all tests pass and `rg -n "timesByDay" src/features/book-call src/routes/book-call.tsx` reports only the route reference that Task 7 will remove.

- [ ] **Step 12: Commit authoritative booking validation**

```powershell
git add src/features/book-call/booking-domain.ts src/features/book-call/booking-domain.test.ts src/features/book-call/booking-service.ts src/features/book-call/booking-service.test.ts src/features/book-call/booking.functions.ts src/features/book-call/booking-repository.server.ts src/features/book-call/booking-repository.server.test.ts
git commit -m "feat: validate bookings against saved availability"
```

---

### Task 6: Replace the Demo Availability Page with an Authenticated Editor

**Files:**

- Create: `src/features/dashboard/use-dashboard-availability.ts`
- Create: `src/features/dashboard/use-dashboard-availability.test.tsx`
- Rewrite: `src/features/dashboard/dashboard-availability.tsx`
- Rewrite: `src/features/dashboard/dashboard-availability.test.tsx`
- Modify: `src/routes/dashboard/availability.tsx`

**Interfaces:**

- Consumes: admin server functions from Task 4, `neonAuth.getJWTToken()`, and existing `ReminderSettings`.
- Produces: `useDashboardAvailability(enabled)` and a controlled `DashboardAvailability` editor.

- [ ] **Step 1: Write failing controller tests**

Create `use-dashboard-availability.test.tsx`. Mock `neonAuth.getJWTToken` and all four admin server functions, then test this public hook contract:

```ts
const { result } = renderHook(() => useDashboardAvailability(true));

await waitFor(() => expect(result.current.configuration).toEqual(configuration));
expect(getAdminAvailability).toHaveBeenCalledWith({ data: { token: "admin-token" } });

await act(async () => {
  await result.current.saveWeekly({ days: configuration.weekly }, false);
});
expect(saveAdminWeeklySchedule).toHaveBeenCalledWith({
  data: { token: "admin-token", input: { days: configuration.weekly }, confirmConflicts: false },
});
```

Add separate tests asserting:

```ts
expect(result.current.error).toBe("Please sign in again.");
expect(result.current.loading).toBe(false);
```

when the token is absent, and:

```ts
expect(result.current.error).toBe("Could not load availability.");
```

when the load result is `{ success: false, reason: "load-error" }`. Also assert that a successful save replaces `configuration`, while a `conflicts` result is returned unchanged to the component and does not replace it.

- [ ] **Step 2: Run the hook test and observe the missing-module failure**

Run:

```powershell
npx vitest run src/features/dashboard/use-dashboard-availability.test.tsx
```

Expected: FAIL because `use-dashboard-availability.ts` does not exist.

- [ ] **Step 3: Implement the authenticated controller**

Create `use-dashboard-availability.ts` with this return shape:

```ts
export type DashboardAvailabilityController = {
  configuration: AvailabilityConfiguration | undefined;
  loading: boolean;
  pending: boolean;
  error: string;
  reload(): Promise<void>;
  saveWeekly(
    input: WeeklyScheduleInput,
    confirmConflicts: boolean,
  ): Promise<AvailabilityMutationResult>;
  saveOverride(
    input: AvailabilityOverrideInput,
    confirmConflicts: boolean,
  ): Promise<AvailabilityMutationResult>;
  deleteOverride(id: string, confirmConflicts: boolean): Promise<AvailabilityMutationResult>;
};
```

Implement `useDashboardAvailability(enabled)` with `useState`, `useCallback`, and `useEffect`. Every call must:

1. Get a fresh token from `neonAuth.getJWTToken()`.
2. Return `{ success: false, reason: "forbidden" }` and set `Please sign in again.` when absent.
3. Call the matching server function with `{ data: ... }`.
4. Replace configuration only when `result.success` is true.
5. Return `conflicts`, `validation`, `overlap`, and `not-found` results unchanged so the component can render precise feedback.
6. Convert thrown calls to `{ success: false, reason: "storage-error" }` and set `Could not save availability.`.
7. Set `pending` in `try/finally` and prevent a second mutation while one is active.

Use `Could not load availability.` for load failures and do not install demo data.

- [ ] **Step 4: Write failing editor interaction tests**

Replace `dashboard-availability.test.tsx` with tests using a persisted `configuration` fixture. Cover these accessible interactions:

```ts
expect(screen.getByRole("heading", { name: "Weekly availability" })).toBeTruthy();
expect(screen.getByLabelText("Thursday open").getAttribute("data-state")).toBe("unchecked");
expect(screen.getByText("60 minutes")).toBeTruthy();
expect(screen.getByText(/Asia\/Jerusalem/)).toBeTruthy();

fireEvent.click(screen.getByRole("button", { name: "Add Sunday hours" }));
expect(screen.getAllByLabelText("Sunday start time")).toHaveLength(2);
fireEvent.click(screen.getByRole("button", { name: "Save weekly schedule" }));
expect(onSaveWeekly).toHaveBeenCalledWith(
  expect.objectContaining({ days: expect.any(Array) }),
  false,
);
```

Add a travel-closure test:

```ts
fireEvent.click(screen.getByRole("button", { name: "Add date exception" }));
fireEvent.click(screen.getByLabelText("Day off"));
fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-08-10" } });
fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-08-20" } });
fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Travel" } });
fireEvent.click(screen.getByRole("button", { name: "Save exception" }));
expect(onSaveOverride).toHaveBeenCalledWith(
  {
    kind: "closed",
    startsOn: "2026-08-10",
    endsOn: "2026-08-20",
    note: "Travel",
    windows: [],
  },
  false,
);
```

Add a custom-hours test using `Thursday opening`, `11:30`, and `13:30`. Add edit and delete tests for an existing exception.

Add a conflict-confirmation test where the first callback resolves to:

```ts
{
  success: false,
  reason: "conflicts",
  conflicts: [{ id: "appointment-1", date: "2026-08-12", startsAt: "11:00", status: "confirmed" }],
}
```

Assert the dialog says `1 existing booking will remain active`, contains a link to `/dashboard/bookings`, and invokes the same action with `confirmConflicts: true` after `Save without cancelling bookings`.

Keep one reminder test proving `onReminderChange({ customerWhatsapp: false, ... })` still works and the copy says `Reminder delivery is simulated.`

- [ ] **Step 5: Run the editor tests and observe the old slot-grid failure**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-availability.test.tsx
```

Expected: FAIL because the old component expects demo slots and exposes no weekly form or exception editor.

- [ ] **Step 6: Implement the weekly editor**

Rewrite `dashboard-availability.tsx` with this prop contract:

```ts
type DashboardAvailabilityProps = {
  configuration: AvailabilityConfiguration;
  pending: boolean;
  onSaveWeekly(
    input: WeeklyScheduleInput,
    confirmConflicts: boolean,
  ): Promise<AvailabilityMutationResult>;
  onSaveOverride(
    input: AvailabilityOverrideInput,
    confirmConflicts: boolean,
  ): Promise<AvailabilityMutationResult>;
  onDeleteOverride(id: string, confirmConflicts: boolean): Promise<AvailabilityMutationResult>;
  reminderSettings: ReminderSettings;
  onReminderChange(settings: ReminderSettings): void;
};
```

Use `useEffect` to reset the local weekly draft when canonical configuration changes. Render all seven labels from:

```ts
const weekdayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
```

The description reads `Times use Palestine time (Asia/Jerusalem). Appointments are 60 minutes.` using `configuration.timezone` and `configuration.slotDurationMinutes`, rather than duplicating those values in component state.

For each day render:

- `Switch` with `aria-label={`${label} open`}`;
- `input type="time" step={1800}` for each start/end, labelled `${label} start time` and `${label} end time`;
- `Add ${label} hours` and `Remove ${label} hours` buttons;
- disabled time fields while the day is closed.

New windows use `{ startsAt: "11:00", endsAt: "12:00" }`. `Save weekly schedule` calls `onSaveWeekly({ days: draft }, false)`. Render `validation.fieldErrors` near the relevant day; render `overlap`, `not-found`, and storage failures as `role="alert"`.

- [ ] **Step 7: Implement exception editing and conflict confirmation**

In the same component, use the existing `Dialog`, `AlertDialog`, `Input`, `Textarea`, `Select`, and `Button` primitives.

The exception form state is exactly:

```ts
type ExceptionDraft = {
  id?: string;
  kind: "closed" | "custom-hours";
  startsOn: string;
  endsOn: string;
  note: string;
  windows: AvailabilityWindow[];
};
```

When `kind` changes to `closed`, set `windows: []`. When it changes to `custom-hours`, set `endsOn` equal to `startsOn` and initialize `[{ startsAt: "11:00", endsAt: "17:00" }]`. Render multi-day date inputs only for `closed`.

Store a pending retry as one of:

```ts
type ConflictRetry =
  | { kind: "weekly"; input: WeeklyScheduleInput; conflicts: OccupiedAppointment[] }
  | { kind: "override"; input: AvailabilityOverrideInput; conflicts: OccupiedAppointment[] }
  | { kind: "delete"; id: string; conflicts: OccupiedAppointment[] };
```

If a mutation returns `reason: "conflicts"`, open `AlertDialog`. Confirmation repeats exactly that operation with `true`; dismissal performs no write. The body states that bookings remain active and gives their count. Use a normal `<a href="/dashboard/bookings">Review bookings</a>`.

List overrides chronologically. Render `Travel · Aug 10–20, 2026` for a multi-day closure and the configured windows for custom hours. Each item has `Edit exception` and `Delete exception` accessible names that include the date range.

Show a success toast only after a successful result and rely on the controller's returned canonical configuration for refresh.

- [ ] **Step 8: Wire the route without demo availability**

Replace `src/routes/dashboard/availability.tsx` with:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/features/auth/neon-auth-client";
import { DashboardAvailability } from "@/features/dashboard/dashboard-availability";
import { useDashboard } from "@/features/dashboard/dashboard-store";
import { useDashboardAvailability } from "@/features/dashboard/use-dashboard-availability";

export const Route = createFileRoute("/dashboard/availability")({
  component: DashboardAvailabilityRoute,
});

function DashboardAvailabilityRoute() {
  const { data: session } = authClient.useSession();
  const { state, dispatch } = useDashboard();
  const controller = useDashboardAvailability(Boolean(session?.user));

  if (controller.loading) return <p className="text-sm text-slate-600">Loading availability…</p>;
  if (controller.error || !controller.configuration) {
    return (
      <div role="alert" className="space-y-3 text-sm text-rose-600">
        <p>{controller.error || "Could not load availability."}</p>
        <button type="button" className="underline" onClick={() => void controller.reload()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <DashboardAvailability
      configuration={controller.configuration}
      pending={controller.pending}
      onSaveWeekly={controller.saveWeekly}
      onSaveOverride={controller.saveOverride}
      onDeleteOverride={controller.deleteOverride}
      reminderSettings={state.reminderSettings}
      onReminderChange={(settings) => dispatch({ type: "reminders/update", settings })}
    />
  );
}
```

- [ ] **Step 9: Run dashboard availability tests**

Run:

```powershell
npx vitest run src/features/dashboard/use-dashboard-availability.test.tsx src/features/dashboard/dashboard-availability.test.tsx
```

Expected: all controller and editor tests pass; no test imports `demoDashboardState.availability`.

- [ ] **Step 10: Commit the authenticated editor**

```powershell
git add src/features/dashboard/use-dashboard-availability.ts src/features/dashboard/use-dashboard-availability.test.tsx src/features/dashboard/dashboard-availability.tsx src/features/dashboard/dashboard-availability.test.tsx src/routes/dashboard/availability.tsx
git commit -m "feat: manage persisted availability in dashboard"
```

---

### Task 7: Drive the Public Calendar from Persisted Availability

**Files:**

- Create: `src/features/book-call/use-booking-availability.ts`
- Create: `src/features/book-call/use-booking-availability.test.tsx`
- Modify: `src/routes/book-call.tsx`
- Create: `src/routes/-book-call.test.tsx`

**Interfaces:**

- Consumes: `getPublicAvailabilityMonth`, `getPublicAvailabilityDay`, and existing `submitBooking`.
- Produces: `useBookingAvailability()` with open dates, current date slots, loading/error state, and reload methods.

- [ ] **Step 1: Write failing public-controller tests**

Create `use-booking-availability.test.tsx`. Mock both public server functions, then cover:

```ts
const { result } = renderHook(() => useBookingAvailability());

await act(async () => {
  await result.current.loadMonth(new Date(2026, 6, 1));
});
expect(getPublicAvailabilityMonth).toHaveBeenCalledWith({ data: { month: "2026-07" } });
expect(result.current.openDates).toEqual(["2026-07-19", "2026-07-20"]);

await act(async () => {
  await result.current.loadDate("2026-07-19");
});
expect(getPublicAvailabilityDay).toHaveBeenCalledWith({ data: { date: "2026-07-19" } });
expect(result.current.slots).toEqual([{ startsAt: "11:00", endsAt: "12:00" }]);
```

Add a test where either function returns `{ success: false, reason: "load-error" }`. Assert `error === "Could not load available appointments."`, the relevant array is empty, and the appropriate loading flag returns to false.

- [ ] **Step 2: Run the controller test and observe the missing module**

Run:

```powershell
npx vitest run src/features/book-call/use-booking-availability.test.tsx
```

Expected: FAIL because `use-booking-availability.ts` does not exist.

- [ ] **Step 3: Implement the public availability controller**

Create `use-booking-availability.ts`:

```ts
import { useCallback, useState } from "react";
import {
  getPublicAvailabilityDay,
  getPublicAvailabilityMonth,
} from "@/features/availability/availability.functions";
import type { AvailableSlot } from "@/features/availability/availability-domain";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function useBookingAvailability() {
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMonth = useCallback(async (month: Date) => {
    setMonthLoading(true);
    setError("");
    try {
      const result = await getPublicAvailabilityMonth({ data: { month: monthKey(month) } });
      if (!result.success) {
        setOpenDates([]);
        setError("Could not load available appointments.");
        return;
      }
      setOpenDates(result.openDates);
    } catch {
      setOpenDates([]);
      setError("Could not load available appointments.");
    } finally {
      setMonthLoading(false);
    }
  }, []);

  const loadDate = useCallback(async (date: string) => {
    setSlotsLoading(true);
    setError("");
    try {
      const result = await getPublicAvailabilityDay({ data: { date } });
      if (!result.success) {
        setSlots([]);
        setError("Could not load available appointments.");
        return;
      }
      setSlots(result.slots);
    } catch {
      setSlots([]);
      setError("Could not load available appointments.");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  return { openDates, slots, monthLoading, slotsLoading, error, loadMonth, loadDate };
}
```

- [ ] **Step 4: Write failing route tests for database-derived dates and stale slots**

Create `src/routes/-book-call.test.tsx`. Mock `SiteNav`, `SiteFooter`, GSAP, `submitBooking`, and `useBookingAvailability`. Return this controller fixture:

```ts
const availability = {
  openDates: ["2026-07-19"],
  slots: [{ startsAt: "11:00", endsAt: "12:00" }],
  monthLoading: false,
  slotsLoading: false,
  error: "",
  loadMonth: vi.fn().mockResolvedValue(undefined),
  loadDate: vi.fn().mockResolvedValue(undefined),
};
```

Test that selecting July 19 calls `loadDate("2026-07-19")`, renders only `11:00`, and never renders an old fixed time such as `12:30`.

Add an error test where `error` is non-empty and assert a `Try again` action is present while time selection is disabled.

Add a stale-slot submission test:

1. Select July 19 and `11:00`.
2. Fill `Full name` with `Noor Al-Hashemi` and `Mobile number` with `+970591234567`.
3. Mock `submitBooking` to return `{ success: false, reason: "slot-unavailable" }`.
4. Submit.
5. Assert `loadDate("2026-07-19")` is called again, the time is cleared, the two customer fields keep their values, and the alert says `That time is no longer available. Please choose another time.`

- [ ] **Step 5: Run the route test and observe fixed-schedule failures**

Run:

```powershell
npx vitest run src/routes/-book-call.test.tsx
```

Expected: FAIL because `book-call.tsx` still imports `timesByDay`, permits fixed weekdays, and cannot refresh a stale slot.

- [ ] **Step 6: Replace fixed calendar rules with the public controller**

In `book-call.tsx`:

- Delete the `timesByDay` import, `appointmentDays`, `AppointmentDay`, `dayNameFormatter`, and `getAppointmentDay`.
- Import `useBookingAvailability`.
- Add `const availability = useBookingAvailability();`.
- On mount, call `void availability.loadMonth(new Date())`.
- Define `selectedDateKey = selectedDate ? formatBookingDate(selectedDate) : ""`.
- Derive `availableTimes = availability.slots.map((slot) => slot.startsAt)`.
- Replace the calendar props with:

```tsx
onSelect={(date) => {
  setSelectedDate(date);
  setSelectedTime("");
  setSubmitted(false);
  if (date) void availability.loadDate(formatBookingDate(date));
}}
onMonthChange={(month) => {
  setSelectedDate(undefined);
  setSelectedTime("");
  void availability.loadMonth(month);
}}
disabled={(date) => !availability.openDates.includes(formatBookingDate(date))}
```

Remove the text claiming fixed available weekdays. Replace it with `Choose any highlighted date to see its current times.`

Above both desktop and mobile time grids, render:

```tsx
{
  availability.error ? (
    <div role="alert" className="mt-6 space-y-3 text-sm text-destructive">
      <p>{availability.error}</p>
      <button
        type="button"
        className="underline"
        onClick={() => {
          if (selectedDateKey) void availability.loadDate(selectedDateKey);
          else void availability.loadMonth(new Date());
        }}
      >
        Try again
      </button>
    </div>
  ) : availability.slotsLoading ? (
    <p className="mt-6 text-sm text-muted-foreground">Loading available times…</p>
  ) : selectedDate && availableTimes.length === 0 ? (
    <p className="mt-6 text-sm text-muted-foreground">No times remain on this date.</p>
  ) : null;
}
```

Do not render time buttons while `availability.error` is non-empty.

- [ ] **Step 7: Preserve form data and refresh after a stale slot**

In the `slot-unavailable` branch of `handleSubmit`, add:

```ts
setSelectedTime("");
if (selectedDate) await availability.loadDate(formatBookingDate(selectedDate));
setError("That time is no longer available. Please choose another time.");
```

Keep name, mobile, notes, appointment type, and selected date unchanged. Keep the generic storage error for availability/database failures.

- [ ] **Step 8: Run controller, route, and booking tests**

Run:

```powershell
npx vitest run src/features/book-call/use-booking-availability.test.tsx src/routes/-book-call.test.tsx src/features/book-call/booking-domain.test.ts src/features/book-call/booking-service.test.ts
rg -n "timesByDay|appointmentDays|getAppointmentDay" src/features/book-call src/routes/book-call.tsx
```

Expected: all tests pass and `rg` returns no matches.

- [ ] **Step 9: Commit the public calendar integration**

```powershell
git add src/features/book-call/use-booking-availability.ts src/features/book-call/use-booking-availability.test.tsx src/routes/book-call.tsx src/routes/-book-call.test.tsx
git commit -m "feat: show live availability on booking calendar"
```

---

### Task 8: Remove Demo Availability, Apply the Migration Safely, and Verify End to End

**Files:**

- Modify: `src/features/dashboard/dashboard-model.ts`
- Modify: `src/features/dashboard/dashboard-model.test.ts`
- Modify: `src/features/dashboard/dashboard-data.ts`
- Modify: `src/features/dashboard/dashboard-store.tsx`
- Modify: `src/features/dashboard/dashboard-store.test.tsx`
- Verify: every file changed in Tasks 1-7

**Interfaces:**

- Consumes: database-backed availability route and public calendar from Tasks 6-7.
- Produces: no demo availability state or local toggle action; verified application and migration status.

- [ ] **Step 1: Write the failing demo-state removal test**

Append to `dashboard-model.test.ts`:

```ts
it("does not expose demo availability as dashboard state", () => {
  expect("availability" in demoDashboardState).toBe(false);
});
```

Import `demoDashboardState` from `./dashboard-data` if the file does not already import it.

- [ ] **Step 2: Run the model test and observe the demo-state failure**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-model.test.ts
```

Expected: FAIL because `demoDashboardState` still has an `availability` property.

- [ ] **Step 3: Remove obsolete demo availability types and actions**

Make these exact removals:

- From `dashboard-model.ts`, delete `WorkingDay`, `AvailabilitySlot`, `workingDayLabels`, `createAvailabilitySlots`, and `DashboardState.availability`.
- From `dashboard-data.ts`, delete the `createAvailabilitySlots` import and `availability: createAvailabilitySlots()` initializer.
- From `dashboard-store.tsx`, delete the `availability/toggle` action and reducer case.
- From `dashboard-store.test.tsx`, delete or rewrite only assertions that dispatch `availability/toggle`; retain appointment, customer, note, and reminder tests.

Do not remove `ReminderSettings`, `DashboardState.reminderSettings`, or `reminders/update`.

- [ ] **Step 4: Run dashboard model/store tests**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-store.test.tsx src/features/dashboard/dashboard-availability.test.tsx
```

Expected: all tests pass and this search returns no result:

```powershell
rg -n "AvailabilitySlot|WorkingDay|availability/toggle|createAvailabilitySlots" src
```

- [ ] **Step 5: Run focused availability and booking verification**

Run:

```powershell
npx vitest run src/features/availability src/features/book-call src/features/dashboard/use-dashboard-availability.test.tsx src/features/dashboard/dashboard-availability.test.tsx src/routes/-book-call.test.tsx
```

Expected: all focused tests pass with zero failed tests and no unhandled errors.

- [ ] **Step 6: Run full automated verification**

Invoke `superpowers:verification-before-completion`, then run fresh commands:

```powershell
npm test
npm run lint
npm run build
git diff --check
```

Expected: Vitest reports zero failures, ESLint exits `0`, the production Vite build exits `0`, and `git diff --check` prints no errors. If an unrelated pre-existing failure remains, record its exact command and output; do not claim the feature is fully verified.

- [ ] **Step 7: Inspect the migration preflight before applying it**

With the target Neon connection available in the current PowerShell session, run this read-only overlap query first:

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -c "SELECT first_appointment.id AS first_id, second_appointment.id AS second_id FROM public.appointments first_appointment JOIN public.appointments second_appointment ON first_appointment.id < second_appointment.id AND first_appointment.status <> 'cancelled' AND second_appointment.status <> 'cancelled' AND tsrange(first_appointment.appointment_date + first_appointment.appointment_time, first_appointment.appointment_date + first_appointment.appointment_time + interval '60 minutes', '[)') && tsrange(second_appointment.appointment_date + second_appointment.appointment_time, second_appointment.appointment_date + second_appointment.appointment_time + interval '60 minutes', '[)');"
```

Expected: zero rows. If rows are returned, stop and report the appointment IDs for supervisor review; do not edit or cancel them automatically.

- [ ] **Step 8: Apply migration 004 to Neon**

Only after the preflight returns zero rows, run:

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f db/migrations/004_create_availability_tables.sql
```

Expected: exit code `0`. Then verify the seed and Thursday setting:

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -c "SELECT day.weekday, day.is_enabled, to_char(window.starts_at, 'HH24:MI') AS starts_at, to_char(window.ends_at, 'HH24:MI') AS ends_at FROM public.weekly_availability_days day JOIN public.weekly_availability_windows window USING (weekday) ORDER BY day.weekday, window.sort_order;"
```

Expected: seven rows, weekdays `0-6`, Thursday `4` is false, and every seeded window is `11:00-17:00`. If `DATABASE_URL` or `psql` is unavailable, report that live migration application remains pending; code verification alone is not database deployment.

- [ ] **Step 9: Perform manual authenticated and public checks**

Start the app:

```powershell
npm run dev
```

Use the in-app browser at desktop and mobile widths and verify:

1. `/dashboard/availability` reloads the persisted seven-day schedule after sign-in.
2. Thursday is closed and the other days are `11:00-17:00`.
3. Extending one day and reloading preserves the change.
4. A travel closure from August 10 through August 20 appears as one editable item.
5. A closure containing an existing booking shows a warning and preserves the booking after confirmation.
6. `/book-call` disables the closure range, shows database-derived slots, and has no fixed weekday copy.
7. A slot booked in a second window disappears after refresh; a stale submission retains the customer's fields.
8. Reminder controls remain marked as simulated.

- [ ] **Step 10: Commit cleanup and verification-facing changes**

```powershell
git add src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-data.ts src/features/dashboard/dashboard-store.tsx src/features/dashboard/dashboard-store.test.tsx
git commit -m "refactor: remove demo availability state"
```

- [ ] **Step 11: Review requirement coverage before handoff**

Check each result directly:

- Default six open days and Thursday closed: migration seed plus domain/UI tests.
- `11:00-17:00` and 60-minute slots: migration seed plus resolver tests.
- Recurring extensions and multiple windows: dashboard editor and persistence tests.
- Single-day custom hours: domain, repository, service, and UI tests.
- Inclusive multi-day travel leave: domain and UI tests.
- Existing bookings preserved with warning: service and UI tests; no appointment mutation in availability repository.
- Public database-derived calendar: public controller and route tests.
- Authoritative server rejection: booking-service tests.
- Concurrent overlap protection: migration contract and booking repository test.
- `Asia/Jerusalem`: domain timezone test.
- Reminder persistence excluded: UI copy and absence from availability repository.

If any item lacks passing evidence, return to its task before claiming completion.

---

## Execution Notes

- Before implementation, use `superpowers:using-git-worktrees` if an isolated worktree can be created without losing the current dirty changes.
- Do not amend, rebase, squash, force-push, or otherwise rewrite published Lovable history.
- Each task must follow the stated RED-GREEN cycle and use only its listed `git add` paths.
- The migration and application must remain in a working state at every commit because pushed commits synchronize into Lovable.
- If the implementation uncovers overlapping live appointments, pause only the migration step; continue code/test work that does not mutate those appointments.
