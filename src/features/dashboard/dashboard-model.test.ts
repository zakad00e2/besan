import { describe, expect, it } from "vitest";
import {
  appointmentsOverlap,
  createAvailabilitySlots,
  getDashboardMetrics,
  type Appointment,
  type Customer,
} from "./dashboard-model";

const customers: Customer[] = [
  {
    id: "customer-1",
    name: "ليان منصور",
    phone: "+970 59 123 4567",
    stage: "new-inquiry",
    updatedAt: "2026-07-05T08:00:00.000Z",
    notes: [],
    activity: [],
  },
];

const appointments: Appointment[] = [
  {
    id: "appointment-1",
    customerId: "customer-1",
    type: "design",
    purpose: "جلسة أولى",
    startsAt: "2026-07-10T10:00:00.000Z",
    endsAt: "2026-07-10T11:00:00.000Z",
    status: "confirmed",
    reminderStatus: "scheduled",
  },
];

describe("createAvailabilitySlots", () => {
  it("creates eight hourly slots for each of five working days", () => {
    const slots = createAvailabilitySlots();

    expect(slots).toHaveLength(40);
    expect(slots[0]).toMatchObject({ day: "sunday", startsAt: "10:00", endsAt: "11:00" });
    expect(slots.at(-1)).toMatchObject({
      day: "thursday",
      startsAt: "17:00",
      endsAt: "18:00",
    });
  });
});

describe("appointmentsOverlap", () => {
  it("detects intersecting times and permits adjacent times", () => {
    expect(
      appointmentsOverlap(appointments[0], "2026-07-10T10:30:00.000Z", "2026-07-10T11:30:00.000Z"),
    ).toBe(true);
    expect(
      appointmentsOverlap(appointments[0], "2026-07-10T11:00:00.000Z", "2026-07-10T12:00:00.000Z"),
    ).toBe(false);
  });
});

describe("getDashboardMetrics", () => {
  it("derives operational totals from shared state", () => {
    expect(
      getDashboardMetrics(customers, appointments, new Date("2026-07-10T08:00:00.000Z")),
    ).toEqual({
      today: 1,
      thisWeek: 1,
      newCustomers: 1,
      needsFollowUp: 1,
    });
  });
});
