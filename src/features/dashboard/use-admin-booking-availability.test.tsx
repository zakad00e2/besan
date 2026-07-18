import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { getJWTToken, getAdminBookingAvailabilityDay, getAdminBookingAvailabilityMonth } =
  vi.hoisted(() => ({
    getJWTToken: vi.fn(),
    getAdminBookingAvailabilityDay: vi.fn(),
    getAdminBookingAvailabilityMonth: vi.fn(),
  }));

vi.mock("@/features/auth/neon-auth-client", () => ({ neonAuth: { getJWTToken } }));
vi.mock("@/features/availability/availability.functions", () => ({
  getAdminBookingAvailabilityDay,
  getAdminBookingAvailabilityMonth,
}));

import { useAdminBookingAvailability } from "./use-admin-booking-availability";

describe("useAdminBookingAvailability", () => {
  it("loads authenticated month and date projections with the edit exclusion", async () => {
    getJWTToken.mockResolvedValue("admin-token");
    getAdminBookingAvailabilityMonth.mockResolvedValue({
      success: true,
      openDates: ["2026-07-19"],
    });
    getAdminBookingAvailabilityDay.mockResolvedValue({
      success: true,
      slots: [{ startsAt: "11:00", endsAt: "12:00" }],
    });
    const { result } = renderHook(() => useAdminBookingAvailability());
    const appointmentId = "11111111-1111-4111-8111-111111111111";

    await act(() => result.current.loadMonth(new Date(2026, 6, 1), appointmentId));
    await act(() => result.current.loadDate("2026-07-19", appointmentId));

    expect(getAdminBookingAvailabilityMonth).toHaveBeenCalledWith({
      data: { token: "admin-token", month: "2026-07", excludeAppointmentId: appointmentId },
    });
    expect(getAdminBookingAvailabilityDay).toHaveBeenCalledWith({
      data: { token: "admin-token", date: "2026-07-19", excludeAppointmentId: appointmentId },
    });
    expect(result.current.slots).toEqual([{ startsAt: "11:00", endsAt: "12:00" }]);
  });

  it("reports missing tokens and clears stale data", async () => {
    getJWTToken.mockResolvedValue(null);
    const { result } = renderHook(() => useAdminBookingAvailability());

    await act(() => result.current.loadMonth(new Date(2026, 6, 1)));
    await waitFor(() => expect(result.current.error).toBe("Please sign in again."));
    act(() => result.current.clear());
    expect(result.current).toMatchObject({ openDates: [], slots: [], error: "" });
  });
});
