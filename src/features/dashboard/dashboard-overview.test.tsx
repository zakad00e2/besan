import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { demoDashboardState } from "./dashboard-data";
import { DashboardOverview } from "./dashboard-overview";

afterEach(cleanup);

describe("DashboardOverview", () => {
  it("switches between day and week schedule views", () => {
    render(
      <DashboardOverview
        customers={demoDashboardState.customers}
        appointments={demoDashboardState.appointments}
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
        customers={demoDashboardState.customers}
        appointments={demoDashboardState.appointments}
        now={new Date("2026-07-10T08:00:00.000Z")}
      />,
    );

    expect(screen.getAllByText("Today's appointments").length).toBeGreaterThan(0);
    expect(screen.getByText("Tomorrow's reminders")).toBeTruthy();
    expect(screen.getAllByText("Needs follow-up").length).toBeGreaterThan(0);
    expect(screen.getByText("Total bookings")).toBeTruthy();
    expect(screen.getAllByText(/Compared with last month/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Layan Mansour").length).toBeGreaterThan(0);
  });
});
