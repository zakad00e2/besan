import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { dashboardFixture } from "@/test/fixtures/dashboard";
import { DashboardCustomerProfile } from "./dashboard-customer-profile";

afterEach(cleanup);

describe("DashboardCustomerProfile", () => {
  it("shows the nearest approved upcoming appointment as the customer stage", () => {
    const customer = { ...dashboardFixture.customers[0], stage: "fitting" as const };
    const first = {
      ...dashboardFixture.appointments[0],
      id: "first-fitting",
      customerId: customer.id,
      purpose: "First Fitting",
      status: "confirmed" as const,
      startsAt: "2026-07-20T13:30:00.000Z",
      endsAt: "2026-07-20T14:30:00.000Z",
    };
    const second = {
      ...first,
      id: "second-fitting",
      purpose: "Second Fitting",
      startsAt: "2026-07-25T13:30:00.000Z",
      endsAt: "2026-07-25T14:30:00.000Z",
    };
    render(
      <DashboardCustomerProfile
        customer={customer}
        appointments={[second, first]}
        now={new Date("2026-07-18T08:00:00.000Z")}
      />,
    );
    expect(screen.getByLabelText("Customer stage").textContent).toBe("First Fitting");
    expect(screen.queryByRole("combobox", { name: "Customer stage" })).toBeNull();
  });

  it("shows the most recent approved non-cancelled stage when none is active", () => {
    const customer = { ...dashboardFixture.customers[0], stage: "fitting" as const };
    const first = {
      ...dashboardFixture.appointments[0],
      id: "past-first",
      customerId: customer.id,
      purpose: "First Fitting",
      status: "completed" as const,
      startsAt: "2026-07-10T10:00:00.000Z",
      endsAt: "2026-07-10T11:00:00.000Z",
    };
    const second = {
      ...first,
      id: "past-second",
      purpose: "Second Fitting",
      startsAt: "2026-07-12T10:00:00.000Z",
      endsAt: "2026-07-12T11:00:00.000Z",
    };
    const cancelled = {
      ...second,
      id: "cancelled-final",
      purpose: "Final Fitting & Pickup",
      status: "cancelled" as const,
      startsAt: "2026-07-14T10:00:00.000Z",
      endsAt: "2026-07-14T11:00:00.000Z",
    };

    render(
      <DashboardCustomerProfile
        customer={customer}
        appointments={[first, second, cancelled]}
        now={new Date("2026-07-18T08:00:00.000Z")}
      />,
    );

    expect(screen.getByLabelText("Customer stage").textContent).toBe("Second Fitting");
  });

  it("falls back to the persisted lifecycle label for legacy appointment history", () => {
    const customer = {
      ...dashboardFixture.customers[0],
      stage: "measurements-appointment" as const,
    };
    const legacy = {
      ...dashboardFixture.appointments[0],
      customerId: customer.id,
      purpose: "Measurements",
    };

    render(<DashboardCustomerProfile customer={customer} appointments={[legacy]} />);

    expect(screen.getByLabelText("Customer stage").textContent).toBe(
      "Measurements appointment",
    );
  });

  it("shows each customer stage note newest first and ignores blank notes", () => {
    const customer = dashboardFixture.customers[0];
    const appointments = [
      {
        ...dashboardFixture.appointments[0],
        id: "stage-note-initial",
        customerId: customer.id,
        purpose: "Initial consultation",
        notes: "Bring reference photos",
        startsAt: "2026-07-10T10:00:00.000Z",
      },
      {
        ...dashboardFixture.appointments[0],
        id: "stage-note-measurements",
        customerId: customer.id,
        purpose: "Measurements",
        notes: "Wear the selected shoes",
        startsAt: "2026-07-12T10:00:00.000Z",
      },
      {
        ...dashboardFixture.appointments[0],
        id: "stage-note-blank",
        customerId: customer.id,
        purpose: "Fitting",
        notes: "   ",
        startsAt: "2026-07-13T10:00:00.000Z",
      },
    ];

    render(<DashboardCustomerProfile customer={customer} appointments={appointments} />);

    const notesSection = screen.getByRole("heading", { name: "Notes" }).parentElement;
    const notesText = notesSection?.textContent ?? "";

    expect(notesText).toContain("Bring reference photos");
    expect(notesText).toContain("Wear the selected shoes");
    expect(notesText).toContain("Initial consultation");
    expect(notesText).toContain("Measurements");
    expect(notesText).not.toContain("Fitting");
    expect(screen.queryByText("No notes.")).toBeNull();
    expect(notesText.indexOf("Wear the selected shoes")).toBeLessThan(
      notesText.indexOf("Bring reference photos"),
    );
  });

  it("does not render an activity section", () => {
    render(
      <DashboardCustomerProfile
        customer={dashboardFixture.customers[0]}
        appointments={dashboardFixture.appointments}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Activity" })).toBeNull();
  });
});
