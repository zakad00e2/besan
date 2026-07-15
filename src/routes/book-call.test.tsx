import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { availability } = vi.hoisted(() => ({
  availability: {
    openDates: ["2026-07-19"],
    slots: [{ startsAt: "11:00", endsAt: "12:00" }],
    monthLoading: false,
    slotsLoading: false,
    error: "",
    loadMonth: vi.fn().mockResolvedValue(undefined),
    loadDate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/components/site-shell", () => ({ SiteFooter: () => null, SiteNav: () => null }));
vi.mock("@/features/book-call/use-booking-availability", () => ({
  useBookingAvailability: () => availability,
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockReturnValue({ matches: true }),
});

import { BookCall } from "./book-call";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-15T12:00:00"));
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("book-call route", () => {
  it("shows persisted slots after an available date is selected", () => {
    render(<BookCall />);

    fireEvent.click(screen.getByRole("button", { name: /sunday, july 19th, 2026/i }));

    expect(availability.loadDate).toHaveBeenCalledWith("2026-07-19");
    expect(screen.getAllByRole("button", { name: "11:00" })).toHaveLength(2);
  });
});
