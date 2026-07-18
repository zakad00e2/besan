import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { availability, submitBooking } = vi.hoisted(() => ({
  availability: {
    openDates: ["2026-07-19"],
    slots: [{ startsAt: "11:00", endsAt: "12:00" }],
    monthLoading: false,
    slotsLoading: false,
    error: "",
    loadMonth: vi.fn().mockResolvedValue(undefined),
    loadDate: vi.fn().mockResolvedValue(undefined),
  },
  submitBooking: vi.fn(),
}));

vi.mock("@/components/site-shell", () => ({ SiteFooter: () => null, SiteNav: () => null }));
vi.mock("gsap", () => ({ default: { context: vi.fn() } }));
vi.mock("@/features/book-call/booking.functions", () => ({ submitBooking }));
vi.mock("@/features/book-call/use-booking-availability", () => ({
  useBookingAvailability: () => availability,
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockReturnValue({ matches: true }),
});

import { BookCall } from "./book-call";

function selectJulyNineteenth() {
  fireEvent.click(screen.getByRole("button", { name: /sunday, july 19th, 2026/i }));
}

function selectJulyTwentieth() {
  fireEvent.click(screen.getByRole("button", { name: /monday, july 20th, 2026/i }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("book-call route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00"));
    vi.clearAllMocks();
    availability.openDates = ["2026-07-19"];
    availability.slots = [{ startsAt: "11:00", endsAt: "12:00" }];
    availability.monthLoading = false;
    availability.slotsLoading = false;
    availability.error = "";
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows only persisted date slots after selecting an open date", () => {
    render(<BookCall />);

    selectJulyNineteenth();

    expect(availability.loadDate).toHaveBeenCalledWith("2026-07-19");
    expect(screen.getAllByRole("button", { name: "11:00" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "12:30" })).toBeNull();
  });

  it("shows a retry action and hides time choices when availability cannot load", () => {
    availability.error = "Could not load available appointments.";
    render(<BookCall />);

    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "11:00" })).toBeNull();
  });

  it("refreshes and clears a stale slot without losing customer details", async () => {
    submitBooking.mockResolvedValue({ success: false, reason: "slot-unavailable" });
    render(<BookCall />);

    selectJulyNineteenth();
    fireEvent.click(screen.getAllByRole("button", { name: "11:00" })[0]);
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Noor Al-Hashemi" } });
    fireEvent.change(screen.getByLabelText("WhatsApp Number"), {
      target: { value: "+970591234567" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));
      await Promise.resolve();
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "That time is no longer available. Please choose another time.",
    );
    expect(availability.loadDate).toHaveBeenCalledTimes(2);
    expect((screen.getByLabelText("Full Name") as HTMLInputElement).value).toBe("Noor Al-Hashemi");
    expect((screen.getByLabelText("WhatsApp Number") as HTMLInputElement).value).toBe(
      "+970591234567",
    );
    expect(screen.getAllByRole("button", { name: "11:00" })[0].className).not.toContain(
      "bg-foreground",
    );
  });

  it("prevents changing the selected calendar date while booking submission is pending", async () => {
    const pendingSubmission = deferred<{ success: false; reason: "slot-unavailable" }>();
    submitBooking.mockImplementationOnce(() => pendingSubmission.promise);
    availability.openDates = ["2026-07-19", "2026-07-20"];
    render(<BookCall />);

    selectJulyNineteenth();
    fireEvent.click(screen.getAllByRole("button", { name: "11:00" })[0]);
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Noor Al-Hashemi" } });
    fireEvent.change(screen.getByLabelText("WhatsApp Number"), {
      target: { value: "+970591234567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));

    selectJulyTwentieth();

    expect(availability.loadDate).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/selected: sunday, july 19, 2026/i)).toBeTruthy();

    await act(async () => {
      pendingSubmission.resolve({ success: false, reason: "slot-unavailable" });
      await Promise.resolve();
    });
  });

  it("keeps the displayed month and availability loader unchanged while booking submission is pending", async () => {
    const pendingSubmission = deferred<{ success: false; reason: "slot-unavailable" }>();
    submitBooking.mockImplementationOnce(() => pendingSubmission.promise);
    render(<BookCall />);

    selectJulyNineteenth();
    fireEvent.click(screen.getAllByRole("button", { name: "11:00" })[0]);
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Noor Al-Hashemi" } });
    fireEvent.change(screen.getByLabelText("WhatsApp Number"), {
      target: { value: "+970591234567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));

    fireEvent.click(screen.getByRole("button", { name: /go to the next month/i }));

    expect(screen.getByRole("button", { name: /sunday, july 19th, 2026/i })).toBeTruthy();
    expect(availability.loadMonth).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingSubmission.resolve({ success: false, reason: "slot-unavailable" });
      await Promise.resolve();
    });
  });
});
