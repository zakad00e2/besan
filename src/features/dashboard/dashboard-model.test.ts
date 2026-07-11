import { describe, expect, it } from "vitest";
import {
  appointmentsOverlap,
  appointmentStatusLabels,
  bookingTypeLabels,
  calculateChangePercent,
  createAvailabilitySlots,
  getDashboardMetricComparisons,
  getDashboardMetrics,
  reminderStatusLabels,
  stageLabels,
  type Appointment,
  type Customer,
  workingDayLabels,
} from "./dashboard-model";
import { demoDashboardState } from "./dashboard-data";

const customers: Customer[] = [
  {
    id: "customer-1",
    name: "Layan Mansour",
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
    purpose: "Initial consultation",
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

describe("dashboard display content", () => {
  it("provides English labels and demo data", () => {
    expect(stageLabels["new-inquiry"]).toBe("New inquiry");
    expect(bookingTypeLabels.workshop).toBe("Workshop");
    expect(appointmentStatusLabels.confirmed).toBe("Confirmed");
    expect(reminderStatusLabels.scheduled).toBe("Scheduled");
    expect(workingDayLabels.sunday).toBe("Sunday");
    expect(demoDashboardState.customers[0].name).toBe("Layan Mansour");
    expect(demoDashboardState.appointments[0].purpose).toBe("Initial consultation");
    expect(JSON.stringify(demoDashboardState)).not.toMatch(/[\u0600-\u06ff]/);
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

describe("calculateChangePercent", () => {
  it("returns rounded month-over-month change", () => {
    expect(calculateChangePercent(12, 10)).toBe(20);
    expect(calculateChangePercent(8, 10)).toBe(-20);
  });

  it("handles zero baselines", () => {
    expect(calculateChangePercent(0, 0)).toBe(0);
    expect(calculateChangePercent(5, 0)).toBeNull();
  });
});

describe("getDashboardMetricComparisons", () => {
  it("compares current month-to-date activity with the same span last month", () => {
    expect(
      getDashboardMetricComparisons(customers, appointments, new Date("2026-07-10T08:00:00.000Z")),
    ).toEqual({
      totalBookings: { current: 1, previous: 0, changePercent: null },
      todayAppointments: { current: 1, previous: 0, changePercent: null },
      newCustomers: { current: 1, previous: 0, changePercent: null },
      needsFollowUp: { current: 1, previous: 0, changePercent: null },
    });
  });
});
