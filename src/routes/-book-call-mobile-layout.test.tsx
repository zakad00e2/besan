import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

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
vi.mock("gsap", () => ({ default: { context: vi.fn() } }));
vi.mock("@/features/book-call/use-booking-availability", () => ({
  useBookingAvailability: () => availability,
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockReturnValue({ matches: true }),
});

import { BookCallPage } from "./book-call";

afterEach(cleanup);

it("stacks the booking detail fields on small screens and restores two columns from sm", () => {
  render(<BookCallPage locale="en" />);

  const detailsGrid = screen.getByLabelText("Full Name").closest("label")!.parentElement!;
  expect(detailsGrid.className).toContain("grid-cols-1");
  expect(detailsGrid.className).toContain("sm:grid-cols-2");
});
