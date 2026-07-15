import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailabilityConfiguration } from "@/features/availability/availability-domain";
import { useDashboardAvailability } from "./use-dashboard-availability";

const {
  getJWTToken,
  getAdminAvailability,
  saveAdminWeeklySchedule,
  saveAdminAvailabilityOverride,
  deleteAdminAvailabilityOverride,
} = vi.hoisted(() => ({
  getJWTToken: vi.fn(),
  getAdminAvailability: vi.fn(),
  saveAdminWeeklySchedule: vi.fn(),
  saveAdminAvailabilityOverride: vi.fn(),
  deleteAdminAvailabilityOverride: vi.fn(),
}));

vi.mock("@/features/auth/neon-auth-client", () => ({ neonAuth: { getJWTToken } }));
vi.mock("@/features/availability/availability.functions", () => ({
  getAdminAvailability,
  saveAdminWeeklySchedule,
  saveAdminAvailabilityOverride,
  deleteAdminAvailabilityOverride,
}));

const configuration: AvailabilityConfiguration = {
  timezone: "Asia/Jerusalem",
  slotDurationMinutes: 60,
  weekly: Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    isEnabled: weekday !== 4,
    windows: [{ startsAt: "11:00", endsAt: "17:00" }],
  })),
  overrides: [],
};

describe("useDashboardAvailability", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getJWTToken.mockResolvedValue("admin-token");
    getAdminAvailability.mockResolvedValue({ success: true, configuration });
  });

  it("loads the authenticated configuration and saves weekly hours", async () => {
    const { result } = renderHook(() => useDashboardAvailability(true));
    await waitFor(() => expect(result.current.configuration).toEqual(configuration));
    expect(getAdminAvailability).toHaveBeenCalledWith({ data: { token: "admin-token" } });

    saveAdminWeeklySchedule.mockResolvedValue({
      success: true,
      configuration: { ...configuration, overrides: [] },
    });
    await act(async () => {
      await result.current.saveWeekly({ days: configuration.weekly }, false);
    });
    expect(saveAdminWeeklySchedule).toHaveBeenCalledWith({
      data: {
        token: "admin-token",
        input: { days: configuration.weekly },
        confirmConflicts: false,
      },
    });
  });

  it("reports a missing token without leaving the loader active", async () => {
    getJWTToken.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDashboardAvailability(true));
    await waitFor(() => expect(result.current.error).toBe("Please sign in again."));
    expect(result.current.loading).toBe(false);
  });

  it("reports failed loads", async () => {
    getAdminAvailability.mockResolvedValue({ success: false, reason: "load-error" });
    const { result } = renderHook(() => useDashboardAvailability(true));
    await waitFor(() => expect(result.current.error).toBe("Could not load availability."));
  });

  it("replaces configuration after a successful save but returns conflicts unchanged", async () => {
    const updated = {
      ...configuration,
      overrides: [
        {
          id: "override-1",
          kind: "closed" as const,
          startsOn: "2026-08-10",
          endsOn: "2026-08-10",
          note: "Travel",
          windows: [],
        },
      ],
    };
    saveAdminAvailabilityOverride.mockResolvedValueOnce({ success: true, configuration: updated });
    const { result } = renderHook(() => useDashboardAvailability(true));
    await waitFor(() => expect(result.current.configuration).toEqual(configuration));
    await act(async () => {
      await result.current.saveOverride(updated.overrides[0], false);
    });
    expect(result.current.configuration).toEqual(updated);
    const conflict = {
      success: false as const,
      reason: "conflicts" as const,
      conflicts: [
        {
          id: "appointment-1",
          date: "2026-08-12",
          startsAt: "11:00",
          status: "confirmed" as const,
        },
      ],
    };
    saveAdminWeeklySchedule.mockResolvedValueOnce(conflict);
    let saved: unknown;
    await act(async () => {
      saved = await result.current.saveWeekly({ days: configuration.weekly }, false);
    });
    expect(saved).toEqual(conflict);
    expect(result.current.configuration).toEqual(updated);
  });
});
