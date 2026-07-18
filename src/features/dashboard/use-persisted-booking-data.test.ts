import { describe, expect, it } from "vitest";
import type { BookingListItem } from "@/features/book-call/booking-domain";
import { getNewBookingIds } from "./use-persisted-booking-data";

const booking = {
  id: "booking-1",
  customerId: "customer-1",
  fullName: "Noor",
  mobile: "+970591234567",
  customerStage: "new-inquiry",
  customerCreatedAt: "2026-07-01T08:00:00.000Z",
  customerUpdatedAt: "2026-07-01T08:00:00.000Z",
  appointmentType: "New Design",
  appointmentDate: "2026-07-20",
  appointmentTime: "10:00",
  notes: "",
  status: "pending",
  reminderStatus: "not-scheduled",
  createdAt: "2026-07-17T08:00:00.000Z",
} satisfies BookingListItem;

describe("getNewBookingIds", () => {
  it("returns only bookings created after the previous visit", () => {
    expect(
      getNewBookingIds(
        [booking, { ...booking, id: "booking-2", createdAt: "2026-07-17T09:00:00.000Z" }],
        "2026-07-17T08:30:00.000Z",
      ),
    ).toEqual(new Set(["booking-2"]));
  });

  it("creates no new indicators for a first visit", () => {
    expect(getNewBookingIds([booking], null)).toEqual(new Set());
  });
});
