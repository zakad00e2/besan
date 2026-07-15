import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingAvailability } from "./use-booking-availability";

const { getPublicAvailabilityMonth, getPublicAvailabilityDay } = vi.hoisted(() => ({
  getPublicAvailabilityMonth: vi.fn(),
  getPublicAvailabilityDay: vi.fn(),
}));

vi.mock("@/features/availability/availability.functions", () => ({
  getPublicAvailabilityMonth,
  getPublicAvailabilityDay,
}));

describe("useBookingAvailability", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads the open dates for a calendar month", async () => {
    getPublicAvailabilityMonth.mockResolvedValue({
      success: true,
      openDates: ["2026-07-19", "2026-07-20"],
    });
    const { result } = renderHook(() => useBookingAvailability());

    await act(async () => {
      await result.current.loadMonth(new Date(2026, 6, 1));
    });

    expect(getPublicAvailabilityMonth).toHaveBeenCalledWith({ data: { month: "2026-07" } });
    expect(result.current.openDates).toEqual(["2026-07-19", "2026-07-20"]);
  });

  it("loads the currently available slots for a date", async () => {
    getPublicAvailabilityDay.mockResolvedValue({
      success: true,
      slots: [{ startsAt: "11:00", endsAt: "12:00" }],
    });
    const { result } = renderHook(() => useBookingAvailability());

    await act(async () => {
      await result.current.loadDate("2026-07-19");
    });

    expect(getPublicAvailabilityDay).toHaveBeenCalledWith({ data: { date: "2026-07-19" } });
    expect(result.current.slots).toEqual([{ startsAt: "11:00", endsAt: "12:00" }]);
  });

  it.each([
    ["month", "loadMonth", () => new Date(2026, 6, 1), getPublicAvailabilityMonth, "openDates"],
    ["date", "loadDate", () => "2026-07-19", getPublicAvailabilityDay, "slots"],
  ] as const)(
    "clears %s data and reports a failed load",
    async (_kind, method, argument, fn, field) => {
      fn.mockResolvedValue({ success: false, reason: "load-error" });
      const { result } = renderHook(() => useBookingAvailability());

      await act(async () => {
        await result.current[method](argument());
      });

      expect(result.current.error).toBe("Could not load available appointments.");
      expect(result.current[field]).toEqual([]);
      expect(result.current[method === "loadMonth" ? "monthLoading" : "slotsLoading"]).toBe(false);
    },
  );
});
