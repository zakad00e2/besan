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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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

  it("keeps slots for the latest requested date when an earlier date responds last", async () => {
    const firstDate = deferred<{ success: true; slots: { startsAt: string; endsAt: string }[] }>();
    const secondDate = deferred<{ success: true; slots: { startsAt: string; endsAt: string }[] }>();
    getPublicAvailabilityDay.mockImplementationOnce(() => firstDate.promise);
    getPublicAvailabilityDay.mockImplementationOnce(() => secondDate.promise);
    const { result } = renderHook(() => useBookingAvailability());

    let firstLoad!: Promise<void>;
    let secondLoad!: Promise<void>;
    act(() => {
      firstLoad = result.current.loadDate("2026-07-19");
      secondLoad = result.current.loadDate("2026-07-20");
    });

    await act(async () => {
      secondDate.resolve({ success: true, slots: [{ startsAt: "14:00", endsAt: "15:00" }] });
      await secondLoad;
    });
    await act(async () => {
      firstDate.resolve({ success: true, slots: [{ startsAt: "09:00", endsAt: "10:00" }] });
      await firstLoad;
    });

    expect(result.current.slots).toEqual([{ startsAt: "14:00", endsAt: "15:00" }]);
  });

  it("keeps open dates for the latest requested month when an earlier month responds last", async () => {
    const firstMonth = deferred<{ success: true; openDates: string[] }>();
    const secondMonth = deferred<{ success: true; openDates: string[] }>();
    getPublicAvailabilityMonth.mockImplementationOnce(() => firstMonth.promise);
    getPublicAvailabilityMonth.mockImplementationOnce(() => secondMonth.promise);
    const { result } = renderHook(() => useBookingAvailability());

    let firstLoad!: Promise<void>;
    let secondLoad!: Promise<void>;
    act(() => {
      firstLoad = result.current.loadMonth(new Date(2026, 6, 1));
      secondLoad = result.current.loadMonth(new Date(2026, 7, 1));
    });

    await act(async () => {
      secondMonth.resolve({ success: true, openDates: ["2026-08-03"] });
      await secondLoad;
    });
    await act(async () => {
      firstMonth.resolve({ success: true, openDates: ["2026-07-19"] });
      await firstLoad;
    });

    expect(result.current.openDates).toEqual(["2026-08-03"]);
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
