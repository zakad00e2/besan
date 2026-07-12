import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDashboardState } from "./dashboard-data";
import { DashboardBookings, filterAppointments, validateAppointment } from "./dashboard-bookings";

afterEach(cleanup);

const designAppointments = demoDashboardState.appointments.filter(
  (appointment) => appointment.type === "design",
);

describe("booking helpers", () => {
  it("filters by customer query, type, and date", () => {
    expect(
      filterAppointments(designAppointments, demoDashboardState.customers, {
        query: "Layan",
        type: "all",
        status: "all",
        date: "all",
      }),
    ).toHaveLength(1);
    expect(
      filterAppointments(designAppointments, demoDashboardState.customers, {
        query: "",
        type: "design",
        status: "all",
        date: "2026-07-10",
      }),
    ).toHaveLength(2);
    expect(
      validateAppointment(
        { customerId: "", type: "design", purpose: "", date: "", time: "" },
        demoDashboardState.appointments,
      ),
    ).toMatchObject({
      customerId: "Select a customer.",
      purpose: "Enter the appointment purpose.",
    });
  });
});

describe("DashboardBookings", () => {
  it("searches bookings and opens the new appointment form", () => {
    render(
      <DashboardBookings
        customers={demoDashboardState.customers}
        appointments={demoDashboardState.appointments}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.queryByText("Corset workshop")).toBeNull();

    fireEvent.change(screen.getByLabelText("Search bookings"), {
      target: { value: "+970 59 123 4567" },
    });
    expect(screen.getAllByText("Layan Mansour").length).toBeGreaterThan(0);
    expect(screen.queryByRole("option", { name: "Workshop" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "New appointment" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Workshop" })).toBeNull();
  });
});
