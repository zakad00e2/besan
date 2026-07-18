import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardFixture } from "@/test/fixtures/dashboard";

const { availability, useAdminBookingAvailability } = vi.hoisted(() => {
  const availability = {
    openDates: ["2026-07-20"],
    slots: [{ startsAt: "13:30", endsAt: "14:30" }],
    monthLoading: false,
    slotsLoading: false,
    error: "",
    loadMonth: vi.fn(),
    loadDate: vi.fn(),
    clear: vi.fn(),
  };
  return {
    availability,
    useAdminBookingAvailability: vi.fn(() => availability),
  };
});

vi.mock("./use-admin-booking-availability", () => ({ useAdminBookingAvailability }));

import { DashboardNextAppointmentDialog } from "./dashboard-next-appointment-dialog";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

function chooseAvailableAppointment() {
  const dateButton = screen
    .getByRole("dialog")
    .querySelector<HTMLButtonElement>('button[data-day="2026-07-20"]');
  expect(dateButton).not.toBeNull();
  expect(dateButton!.disabled).toBe(false);
  fireEvent.click(dateButton!);
  const timeButton = screen.getByRole("button", { name: "13:30 available" });
  fireEvent.click(timeButton);
  expect(timeButton.getAttribute("aria-pressed")).toBe("true");
}

describe("DashboardNextAppointmentDialog", () => {
  it("shows only the four approved next-appointment stages in order", () => {
    render(
      <DashboardNextAppointmentDialog
        open
        currentAppointment={dashboardFixture.appointments[0]}
        customer={dashboardFixture.customers[0]}
        appointments={dashboardFixture.appointments}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const purpose = screen.getByLabelText("Appointment purpose");
    expect(within(purpose).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Select an appointment purpose",
      "Initial Consultation",
      "First Fitting",
      "Second Fitting",
      "Final Fitting & Pickup",
    ]);
  });

  it("labels the submit button Scheduling… while a submission is pending", async () => {
    let resolveSubmission: (value: { success: true }) => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<{ success: true }>((resolve) => {
          resolveSubmission = resolve;
        }),
    );
    render(
      <DashboardNextAppointmentDialog
        open
        currentAppointment={dashboardFixture.appointments[0]}
        customer={dashboardFixture.customers[0]}
        appointments={dashboardFixture.appointments}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText("Appointment purpose"), {
      target: { value: "Initial Consultation" },
    });
    chooseAvailableAppointment();
    fireEvent.click(screen.getByRole("button", { name: "Complete & schedule next" }));

    expect(
      ((await screen.findByRole("button", { name: "Scheduling…" })) as HTMLButtonElement).disabled,
    ).toBe(true);
    resolveSubmission!({ success: true });
  });

  it("fixes the customer, submits selected next-appointment values once, and closes on success", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    render(
      <DashboardNextAppointmentDialog
        open
        currentAppointment={dashboardFixture.appointments[0]}
        customer={dashboardFixture.customers[0]}
        appointments={dashboardFixture.appointments}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Layan Mansour")).toBeTruthy();
    expect(within(dialog).queryByRole("option", { name: "Sarah Khalil" })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText("Appointment purpose"), {
      target: { value: "Second Fitting" },
    });
    chooseAvailableAppointment();
    fireEvent.click(within(dialog).getByRole("button", { name: "Complete & schedule next" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(availability.loadMonth).toHaveBeenCalled();
    expect(availability.loadDate).toHaveBeenCalledWith("2026-07-20");
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        currentAppointmentId: "appointment-1",
        appointmentType: "Second Fitting",
        appointmentDate: "2026-07-20",
        appointmentTime: "13:30",
        reminderStatus: "scheduled",
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("keeps entered values and reports a slot conflict", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: false, reason: "slot-unavailable" });
    render(
      <DashboardNextAppointmentDialog
        open
        currentAppointment={dashboardFixture.appointments[0]}
        customer={dashboardFixture.customers[0]}
        appointments={[]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText("Appointment purpose"), {
      target: { value: "Final Fitting & Pickup" },
    });
    chooseAvailableAppointment();
    fireEvent.click(screen.getByRole("button", { name: "Complete & schedule next" }));
    expect((await screen.findByRole("alert")).textContent).toContain("already has an appointment");
    expect((screen.getByLabelText("Appointment purpose") as HTMLSelectElement).value).toBe(
      "Final Fitting & Pickup",
    );
  });

  it("reports a storage error and re-enables the form when submission rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Database unavailable"));
    render(
      <DashboardNextAppointmentDialog
        open
        currentAppointment={dashboardFixture.appointments[0]}
        customer={dashboardFixture.customers[0]}
        appointments={[]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText("Appointment purpose"), {
      target: { value: "Final Fitting & Pickup" },
    });
    chooseAvailableAppointment();
    fireEvent.click(screen.getByRole("button", { name: "Complete & schedule next" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not schedule the next appointment. Please try again.",
    );
    expect((screen.getByLabelText("Appointment purpose") as HTMLSelectElement).disabled).toBe(
      false,
    );
    expect(
      (screen.getByRole("button", { name: "13:30 available" }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Complete & schedule next" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
