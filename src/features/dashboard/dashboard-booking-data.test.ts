import { describe, expect, it } from "vitest";
import type { BookingListItem } from "@/features/book-call/booking-domain";
import { mergeScheduledNext, normalizeBookingList } from "./dashboard-booking-data";

const first: BookingListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  customerStage: "new-inquiry",
  customerUpdatedAt: "2026-07-01T09:00:00.000Z",
  appointmentType: "New Design",
  appointmentDate: "2026-07-14",
  appointmentTime: "10:00",
  notes: "Initial sketches",
  status: "confirmed",
  reminderStatus: "sent",
  createdAt: "2026-07-01T10:00:00.000Z",
};

describe("dashboard booking data", () => {
  it("normalizes repeated bookings under one real customer", () => {
    const data = normalizeBookingList([
      first,
      { ...first, id: "33333333-3333-4333-8333-333333333333", appointmentTime: "12:00" },
    ]);
    expect(data.customers).toHaveLength(1);
    expect(data.customers[0].id).toBe(first.customerId);
    expect(data.appointments.map((item) => item.customerId)).toEqual([
      first.customerId,
      first.customerId,
    ]);
    expect(data.appointments[0].endsAt).toBe("2026-07-14T11:00:00.000Z");
  });

  it("merges the completed current appointment, next appointment, and customer stage", () => {
    const data = normalizeBookingList([first]);
    const current = {
      ...first,
      status: "completed" as const,
      customerStage: "measurements-appointment" as const,
    };
    const next = {
      ...first,
      id: "33333333-3333-4333-8333-333333333333",
      appointmentType: "Measurements" as const,
      appointmentDate: "2026-07-20",
      appointmentTime: "13:30",
      status: "confirmed" as const,
      reminderStatus: "scheduled" as const,
      customerStage: "measurements-appointment" as const,
    };
    const merged = mergeScheduledNext(data, current, next);
    expect(merged.customers[0].stage).toBe("measurements-appointment");
    expect(merged.appointments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.id, status: "completed" }),
        expect.objectContaining({ id: next.id, purpose: "Measurements" }),
      ]),
    );
  });
});
