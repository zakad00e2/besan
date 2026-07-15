import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEEKLY_SCHEDULE,
  findScheduleConflicts,
  getLocalDateInTimeZone,
  hasOverrideOverlap,
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

  it("rejects inclusive override range intersections but permits replacing the same override", () => {
    const existing = [
      {
        id: "leave",
        kind: "closed" as const,
        startsOn: "2026-08-10",
        endsOn: "2026-08-12",
        note: "Travel",
        windows: [],
      },
    ];

    expect(
      hasOverrideOverlap(
        {
          kind: "closed",
          startsOn: "2026-08-12",
          endsOn: "2026-08-14",
          note: "Personal leave",
          windows: [],
        },
        existing,
      ),
    ).toBe(true);
    expect(
      hasOverrideOverlap(
        {
          ...existing[0],
          note: "Updated travel note",
        },
        existing,
      ),
    ).toBe(false);
  });
});
