import { describe, expect, it, vi } from "vitest";
import { DEFAULT_WEEKLY_SCHEDULE, type AvailabilityConfiguration } from "./availability-domain";
import {
  deleteOverrideForAdmin,
  getOpenDatesForMonth,
  getSlotsForDate,
  loadAvailabilityForAdmin,
  loadOpenDatesForAdmin,
  loadSlotsForAdmin,
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
        slots: expect.arrayContaining([{ startsAt: "11:00", endsAt: "12:00" }]),
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

  it("authorizes admin slot projection and excludes only the edited appointment", async () => {
    const deps = dependencies();
    deps.repository.listOccupiedAppointments.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        date: "2026-07-19",
        startsAt: "11:00",
        status: "confirmed",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        date: "2026-07-19",
        startsAt: "12:00",
        status: "confirmed",
      },
    ]);

    const result = await loadSlotsForAdmin(
      {
        token: "admin-token",
        date: "2026-07-19",
        excludeAppointmentId: "11111111-1111-4111-8111-111111111111",
      },
      deps,
    );

    expect(result).toMatchObject({ success: true });
    if (result.success) {
      expect(result.slots.map((slot) => slot.startsAt)).toContain("11:00");
      expect(result.slots.map((slot) => slot.startsAt)).not.toContain("12:00");
    }
  });

  it("does not resolve booking availability for a forbidden administrator", async () => {
    const deps = dependencies(false);

    await expect(
      loadOpenDatesForAdmin({ token: "bad-token", month: "2026-07" }, deps),
    ).resolves.toEqual({ success: false, reason: "forbidden" });
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
