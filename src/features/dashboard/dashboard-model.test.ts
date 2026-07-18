import { describe, expect, it } from "vitest";
import {
  appointmentsOverlap,
  appointmentStatusLabels,
  bookingTypeLabels,
  calculateChangePercent,
  getDashboardMetricComparisons,
  getDashboardMetrics,
  getBookingStatusDistribution,
  reminderStatusLabels,
  stageLabels,
  type Appointment,
  type Customer,
} from "./dashboard-model";
import { dashboardFixture } from "@/test/fixtures/dashboard";

it("does not expose demo availability as dashboard state", () => {
  expect("availability" in dashboardFixture).toBe(false);
});

const customers: Customer[] = [
  {
    id: "customer-1",
    name: "Layan Mansour",
    phone: "+970 59 123 4567",
    stage: "new-inquiry",
    createdAt: "2026-07-01T08:00:00.000Z",
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

describe("dashboard display content", () => {
  it("provides English labels and demo data", () => {
    expect(stageLabels["new-inquiry"]).toBe("New inquiry");
    expect(stageLabels["measurements-appointment"]).toBe("Measurements appointment");
    expect(bookingTypeLabels.workshop).toBe("Workshop");
    expect(appointmentStatusLabels.confirmed).toBe("Confirmed");
    expect(reminderStatusLabels.scheduled).toBe("Scheduled");
    expect(dashboardFixture.customers[0].name).toBe("Layan Mansour");
    expect(dashboardFixture.appointments[0].purpose).toBe("Initial consultation");
    expect(JSON.stringify(dashboardFixture)).not.toMatch(/[\u0600-\u06ff]/);
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

describe("getBookingStatusDistribution", () => {
  it("counts every booking status", () => {
    const statusAppointments: Appointment[] = [
      { ...appointments[0], id: "confirmed", status: "confirmed" },
      { ...appointments[0], id: "pending", status: "pending" },
      { ...appointments[0], id: "completed", status: "completed" },
      { ...appointments[0], id: "cancelled", status: "cancelled" },
      { ...appointments[0], id: "confirmed-2", status: "confirmed" },
    ];

    expect(getBookingStatusDistribution(statusAppointments)).toEqual({
      confirmed: 2,
      pending: 1,
      completed: 1,
      cancelled: 1,
    });
  });

  it("returns zero counts for an empty appointment list", () => {
    expect(getBookingStatusDistribution([])).toEqual({
      confirmed: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
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

  it("uses the persisted customer creation timestamp for new-customer comparisons", () => {
    const staleCustomer = {
      ...customers[0],
      createdAt: "2026-06-01T08:00:00.000Z",
      updatedAt: "2026-07-05T08:00:00.000Z",
    };

    expect(
      getDashboardMetricComparisons(
        [staleCustomer],
        appointments,
        new Date("2026-07-10T08:00:00.000Z"),
      ),
    ).toMatchObject({
      newCustomers: { current: 0, previous: 1, changePercent: -100 },
    });
  });
});
