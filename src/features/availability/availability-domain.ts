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
  | { success: true; data: T }
  | { success: false; fieldErrors: Record<string, string> };

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
  if (!parsed.success) {
    return { success: false, fieldErrors: { schedule: "Configure all seven days." } };
  }
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
  if (!parsed.success) {
    return { success: false, fieldErrors: { override: "Enter a valid exception." } };
  }
  const fieldErrors: Record<string, string> = {};
  if (parsed.data.endsOn < parsed.data.startsOn) {
    fieldErrors.endsOn = "End date cannot precede start date.";
  }
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

export function hasOverrideOverlap(
  input: AvailabilityOverrideInput,
  existing: AvailabilityOverride[],
): boolean {
  return existing.some(
    (override) =>
      override.id !== input.id &&
      input.startsOn <= override.endsOn &&
      input.endsOn >= override.startsOn,
  );
}

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
          overlaps(startsAt, endsAt, item.startsAt, addMinutes(item.startsAt, SLOT_DURATION_MINUTES)),
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
