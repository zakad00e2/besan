import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dashboardFixture } from "@/test/fixtures/dashboard";

const { useAdminBookingAvailability } = vi.hoisted(() => ({
  useAdminBookingAvailability: vi.fn(() => ({
    openDates: ["2026-07-19"],
    slots: [{ startsAt: "11:00", endsAt: "12:00" }],
    monthLoading: false,
    slotsLoading: false,
    error: "",
    loadMonth: vi.fn(),
    loadDate: vi.fn(),
    clear: vi.fn(),
  })),
}));

vi.mock("./use-admin-booking-availability", () => ({ useAdminBookingAvailability }));

import {
  DashboardBookings,
  filterAppointments,
  getReminderHref,
  validateAppointment,
} from "./dashboard-bookings";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const designAppointments = dashboardFixture.appointments.filter(
  (appointment) => appointment.type === "design",
);

describe("booking helpers", () => {
  it("filters by customer query and date", () => {
    expect(
      filterAppointments(designAppointments, dashboardFixture.customers, {
        query: "Layan",
        status: "all",
        date: "all",
        period: "all",
      }),
    ).toHaveLength(1);
    expect(
      filterAppointments(designAppointments, dashboardFixture.customers, {
        query: "",
        status: "all",
        date: "2026-07-10",
        period: "all",
      }),
    ).toHaveLength(2);
    expect(
      validateAppointment(
        {
          customerId: "",
          type: "design",
          purpose: "",
          notes: "",
          date: "",
          time: "",
          status: "confirmed",
          reminderStatus: "scheduled",
        },
        dashboardFixture.appointments,
      ),
    ).toMatchObject({
      customerId: "Select a customer.",
      purpose: "Enter the appointment purpose.",
    });
  });

  it("filters design appointments by past and upcoming calendar dates", () => {
    const filters = { query: "", status: "all" as const, date: "all" as const };

    expect(
      filterAppointments(
        designAppointments,
        dashboardFixture.customers,
        { ...filters, period: "past" },
        "2026-07-10",
      ).map((appointment) => appointment.id),
    ).toEqual(["appointment-7", "appointment-9"]);

    expect(
      filterAppointments(
        designAppointments,
        dashboardFixture.customers,
        { ...filters, period: "upcoming" },
        "2026-07-10",
      ).map((appointment) => appointment.id),
    ).toEqual(["appointment-1", "appointment-2", "appointment-4", "appointment-5"]);

    expect(
      filterAppointments(
        designAppointments,
        dashboardFixture.customers,
        { ...filters, period: "all" },
        "2026-07-10",
      ),
    ).toHaveLength(6);
  });
});

describe("DashboardBookings", () => {
  it("shows a new booking badge only for supplied booking IDs", () => {
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
        newBookingIds={new Set(["appointment-1"])}
      />,
    );

    expect(screen.getAllByText("New booking")).toHaveLength(2);
    expect(screen.getAllByLabelText("New booking")).toHaveLength(2);
  });

  it("links a customer name in the bookings table to that customer profile", () => {
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
      />,
    );

    expect(screen.getAllByRole("link", { name: "Layan Mansour" })[0].getAttribute("href")).toBe(
      "/dashboard/customers/customer-1",
    );
  });

  it("searches bookings and opens the new appointment form", () => {
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
      />,
    );

    expect(screen.queryByText("Corset workshop")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search bookings"), {
      target: { value: "+970 59 123 4567" },
    });
    expect(screen.getAllByText("Layan Mansour").length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: /message layan mansour on whatsapp/i })[0]
        .getAttribute("href"),
    ).toBe("https://wa.me/970591234567");
    expect(screen.queryByRole("option", { name: "Workshop" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "New appointment" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(screen.getByLabelText("Customer name")).toBeTruthy();
    expect(screen.getByLabelText("Phone number")).toBeTruthy();
    expect(screen.queryByLabelText("Customer")).toBeNull();
    expect(screen.queryByRole("option", { name: "Workshop" })).toBeNull();
    expect(
      within(within(dialog).getByLabelText("Appointment purpose"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Select an appointment purpose",
      "Custom Design",
      "Consultation",
      "Dresses for Rent",
    ]);
    expect(screen.getByLabelText(/notes/i)).toBeTruthy();
    expect(screen.getByLabelText("Booking status")).toBeTruthy();
    expect(screen.getByText("Available date")).toBeTruthy();
  });

  it("renders time-only availability values in the appointment form", () => {
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "New appointment" }));

    expect(screen.getByRole("button", { name: "11:00" })).toBeTruthy();
  });

  it("filters rendered bookings by period", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T08:00:00.000Z"));
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
      />,
    );

    fireEvent.change(screen.getByLabelText("Period"), { target: { value: "past" } });

    expect(screen.getAllByText("Fabric consultation").length).toBeGreaterThan(0);
    expect(screen.queryByText("Initial consultation")).toBeNull();
  });

  it("opens the edit form with all displayed booking details", () => {
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Edit Initial consultation" })[0]);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Edit appointment" })).toBeTruthy();
    expect((within(dialog).getByLabelText("Customer") as HTMLSelectElement).value).toBe(
      "customer-1",
    );
    expect((within(dialog).getByLabelText("Appointment purpose") as HTMLSelectElement).value).toBe(
      "Initial consultation",
    );
    expect(within(dialog).getByRole("option", { name: "Custom Design" })).toBeTruthy();
    expect(within(dialog).queryByRole("option", { name: "First Fitting" })).toBeNull();
    expect(within(dialog).getByText("Available date")).toBeTruthy();
    expect(within(dialog).getByText("Available time")).toBeTruthy();
    expect((within(dialog).getByLabelText("Booking status") as HTMLSelectElement).value).toBe(
      "confirmed",
    );
  });

  it("lets an admin change a booking status from the table", () => {
    const onStatusChange = vi.fn();
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
        onStatusChange={onStatusChange}
      />,
    );

    fireEvent.change(screen.getAllByLabelText("Status for Initial consultation")[0], {
      target: { value: "completed" },
    });

    expect(onStatusChange).toHaveBeenCalledWith("appointment-1", "completed");
  });

  it("confirms before deleting a booking", () => {
    const onDelete = vi.fn();
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Delete Initial consultation" })[0]);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete booking" }));

    expect(onDelete).toHaveBeenCalledWith("appointment-1");
  });

  it("shows a note preview instead of the complete note in the table", () => {
    const fullNote = "Bring a selection of reference photos and fabric samples for review.";
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments.map((appointment) =>
          appointment.id === "appointment-1" ? { ...appointment, notes: fullNote } : appointment,
        )}
      />,
    );

    expect(screen.queryByText(fullNote)).toBeNull();
    fireEvent.click(
      screen.getAllByRole("button", { name: "View notes for Initial consultation" })[0],
    );

    expect(screen.getByRole("dialog").textContent).toContain(fullNote);
  });

  it("does not show a note preview control for a complete short note", () => {
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments.map((appointment) =>
          appointment.id === "appointment-1"
            ? { ...appointment, notes: "Bring sketches." }
            : appointment,
        )}
      />,
    );

    expect(screen.getAllByText("Bring sketches.").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "View notes for Initial consultation" }),
    ).toBeNull();
  });

  it("moves the not-scheduled reminder into an enabled bell action", () => {
    const onReminderSent = vi.fn();
    const appointment = {
      ...designAppointments[0],
      reminderStatus: "not-scheduled" as const,
    };
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={[appointment]}
        onReminderSent={onReminderSent}
      />,
    );

    expect(screen.queryByRole("columnheader", { name: "Reminder" })).toBeNull();
    const reminderLink = screen.getAllByRole("link", {
      name: "Send reminder to Layan Mansour",
    })[0];
    expect(reminderLink.getAttribute("title")).toBe("Send reminder");
    expect(reminderLink.getAttribute("href")).toBe(
      getReminderHref(appointment, dashboardFixture.customers[0]),
    );
    fireEvent.click(reminderLink);

    expect(onReminderSent).toHaveBeenCalledWith("appointment-1");
  });

  it("keeps scheduled and sent reminder bells visible but disabled", () => {
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={[
          { ...designAppointments[0], id: "scheduled", reminderStatus: "scheduled" },
          { ...designAppointments[0], id: "sent", reminderStatus: "sent" },
        ]}
      />,
    );

    expect(
      screen
        .getAllByRole("button", { name: "Reminder Scheduled for Layan Mansour" })
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("button", { name: "Reminder Sent for Layan Mansour" })
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
  });

  it("opens next appointment scheduling for non-cancelled bookings only", () => {
    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
        onScheduleNext={vi.fn()}
      />,
    );

    expect(
      screen.getAllByRole("button", { name: "Schedule next appointment for Layan Mansour" }).length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Schedule next appointment for Layan Mansour" })[0],
    );
    expect(screen.getByRole("heading", { name: "Next appointment" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Initial Consultation" })).toBeTruthy();
    cleanup();

    render(
      <DashboardBookings
        customers={dashboardFixture.customers}
        appointments={[{ ...designAppointments[0], status: "cancelled" }]}
        onScheduleNext={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Schedule next appointment for Layan Mansour" }),
    ).toBeNull();
  });
});
