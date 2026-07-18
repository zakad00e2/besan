import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { dashboardFixture } from "@/test/fixtures/dashboard";
import { DashboardOverview, getDashboardGreeting, getReminderProgress } from "./dashboard-overview";

afterEach(cleanup);

describe("DashboardOverview", () => {
  it("selects the greeting for the current local time", () => {
    expect(getDashboardGreeting(new Date("2026-07-17T05:00:00"))).toBe("Good morning Besan 🫰");
    expect(getDashboardGreeting(new Date("2026-07-17T12:00:00"))).toBe("Good afternoon Besan 🫰");
    expect(getDashboardGreeting(new Date("2026-07-17T17:00:00"))).toBe("Good evening Besan 🫰");
    expect(getDashboardGreeting(new Date("2026-07-17T22:00:00"))).toBe("Good night Besan 🌙");
  });

  it("excludes past and cancelled appointments from reminder progress", () => {
    const now = new Date("2026-07-10T08:00:00.000Z");
    const appointments = [
      { ...dashboardFixture.appointments[0], reminderStatus: "sent" as const },
      { ...dashboardFixture.appointments[2], reminderStatus: "scheduled" as const },
      { ...dashboardFixture.appointments[5], reminderStatus: "sent" as const },
      { ...dashboardFixture.appointments[3], status: "cancelled" as const, reminderStatus: "scheduled" as const },
    ];

    expect(getReminderProgress(appointments, now)).toEqual({ sent: 1, active: 2, percent: 50 });
  });

  it("switches between day and week schedule views", () => {
    render(
      <DashboardOverview
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
        now={new Date("2026-07-10T08:00:00.000Z")}
      />,
    );

    expect(screen.getByRole("heading", { name: "Today's appointments" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(screen.getByRole("heading", { name: "This week's appointments" })).toBeTruthy();
  });

  it("shows metrics, reminder queue, and follow-up customers", () => {
    render(
      <DashboardOverview
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
        now={new Date("2026-07-10T08:00:00.000Z")}
      />,
    );

    expect(screen.getAllByText("Today's appointments").length).toBeGreaterThan(0);
    expect(screen.getByText("Tomorrow's reminders")).toBeTruthy();
    expect(screen.getAllByText("Needs follow-up").length).toBeGreaterThan(0);
    expect(screen.getByText("Total bookings")).toBeTruthy();
    expect(screen.getAllByText(/Compared with last month/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Layan Mansour").length).toBeGreaterThan(0);
    const chart = screen
      .getByRole("heading", { name: "Booking status distribution" })
      .closest("article");
    expect(chart).toBeTruthy();
    expect(within(chart!).getByText(String(dashboardFixture.appointments.length))).toBeTruthy();
    expect(within(chart!).getByText("Confirmed")).toBeTruthy();
    expect(within(chart!).getByText("Pending")).toBeTruthy();
    expect(within(chart!).getByText("Completed")).toBeTruthy();
    expect(within(chart!).getByText("Cancelled")).toBeTruthy();
  });

  it("shows tomorrow's appointments whose reminders have not been sent", () => {
    const tomorrowAppointments = [
      {
        ...dashboardFixture.appointments[2],
        id: "tomorrow-reminder-1",
        customerId: "customer-1",
        purpose: "First fitting",
        status: "confirmed" as const,
        reminderStatus: "not-scheduled" as const,
      },
      {
        ...dashboardFixture.appointments[2],
        id: "tomorrow-reminder-2",
        customerId: "customer-2",
        purpose: "Measurements",
        status: "confirmed" as const,
        reminderStatus: "not-scheduled" as const,
      },
    ];

    render(
      <DashboardOverview
        customers={dashboardFixture.customers}
        appointments={tomorrowAppointments}
        now={new Date("2026-07-10T08:00:00.000Z")}
      />,
    );

    const reminders = screen
      .getByRole("heading", { name: "Tomorrow's reminders" })
      .closest("article");
    expect(reminders).toBeTruthy();
    expect(within(reminders!).getByText("Layan Mansour")).toBeTruthy();
    expect(within(reminders!).getByText("Sarah Khalil")).toBeTruthy();
    expect(within(reminders!).getAllByText("Not scheduled")).toHaveLength(2);
  });

  it("uses the local calendar day for tomorrow's reminders after local midnight", () => {
    const now = new Date(2026, 6, 11, 0, 30);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, "0"),
      String(tomorrow.getDate()).padStart(2, "0"),
    ].join("-");
    const appointment = {
      ...dashboardFixture.appointments[0],
      startsAt: `${tomorrowKey}T10:00:00.000Z`,
      endsAt: `${tomorrowKey}T11:00:00.000Z`,
      reminderStatus: "not-scheduled" as const,
    };

    render(
      <DashboardOverview
        customers={dashboardFixture.customers}
        appointments={[appointment]}
        now={now}
      />,
    );

    const reminders = screen
      .getByRole("heading", { name: "Tomorrow's reminders" })
      .closest("article");
    expect(reminders).toBeTruthy();
    expect(within(reminders!).getByText("Layan Mansour")).toBeTruthy();
  });
});
