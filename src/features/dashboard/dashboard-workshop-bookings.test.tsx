import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkshopBookingListItem } from "@/features/workshop-booking/workshop-booking";
import { DashboardWorkshopBookings, filterWorkshopBookings } from "./dashboard-workshop-bookings";

const bookings: WorkshopBookingListItem[] = [
  {
    id: "workshop-booking-1",
    workshopId: "mini-course",
    workshopName: "Private mini course",
    fullName: "Noor Al-Hashemi",
    mobile: "+970591234567",
    email: "noor@example.com",
    date: "2026-07-13",
    participants: 3,
    notes: "Vegetarian lunch",
    status: "pending",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "workshop-booking-2",
    workshopId: "corset-workshop",
    workshopName: "One-day corset workshop",
    fullName: "Layan Mansour",
    mobile: "+970599876543",
    email: "layan@example.com",
    date: "2026-07-14",
    participants: 1,
    notes: "",
    status: "confirmed",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-07-02T10:00:00.000Z",
  },
];

afterEach(cleanup);

describe("filterWorkshopBookings", () => {
  it("matches customer details and applies workshop and status filters", () => {
    expect(
      filterWorkshopBookings(bookings, {
        query: "noor@example.com",
        workshopId: "all",
        status: "all",
      }),
    ).toEqual([bookings[0]]);
    expect(
      filterWorkshopBookings(bookings, {
        query: "",
        workshopId: "corset-workshop",
        status: "confirmed",
      }),
    ).toEqual([bookings[1]]);
  });
});

describe("DashboardWorkshopBookings", () => {
  it("renders matching results in desktop table and mobile articles", () => {
    render(<DashboardWorkshopBookings bookings={bookings} onStatusChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Search workshop bookings"), {
      target: { value: "noor@example.com" },
    });

    expect(screen.getAllByText("Noor Al-Hashemi").length).toBeGreaterThan(0);
    expect(screen.queryByText("Layan Mansour")).toBeNull();
    expect(document.querySelector("table")).not.toBeNull();
    expect(document.querySelectorAll("article").length).toBeGreaterThan(0);
  });

  it("renders booking notes in both desktop and mobile layouts", () => {
    render(<DashboardWorkshopBookings bookings={bookings} onStatusChange={vi.fn()} />);

    expect(screen.getAllByText("Vegetarian lunch").length).toBe(2);
  });

  it("filters by both selects and calls for a validated status change", () => {
    const onStatusChange = vi.fn();
    render(<DashboardWorkshopBookings bookings={bookings} onStatusChange={onStatusChange} />);

    fireEvent.change(screen.getByLabelText("Workshop"), { target: { value: "mini-course" } });
    fireEvent.change(screen.getByLabelText("Booking status"), { target: { value: "pending" } });
    expect(screen.getAllByText("Noor Al-Hashemi").length).toBeGreaterThan(0);
    expect(screen.queryByText("Layan Mansour")).toBeNull();

    fireEvent.change(screen.getAllByLabelText("Status for Noor Al-Hashemi")[0], {
      target: { value: "confirmed" },
    });
    expect(onStatusChange).toHaveBeenCalledWith("workshop-booking-1", "confirmed");
  });

  it("shows an empty state when no workshop bookings match", () => {
    render(<DashboardWorkshopBookings bookings={bookings} onStatusChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Search workshop bookings"), {
      target: { value: "missing customer" },
    });
    expect(screen.getByText("No workshop bookings")).toBeTruthy();
  });

  it("keeps the current status while a row update fails", () => {
    render(
      <DashboardWorkshopBookings
        bookings={bookings}
        onStatusChange={vi.fn()}
        updatingId="workshop-booking-1"
        updateError="Could not update this workshop booking."
      />,
    );

    const statusSelect = screen.getAllByLabelText("Status for Noor Al-Hashemi")[0];
    expect(statusSelect).toHaveProperty("value", "pending");
    expect(statusSelect).toHaveProperty("disabled", true);
    expect(screen.getByRole("alert").textContent).toBe("Could not update this workshop booking.");
  });

  it("renders actions and submits an edit or confirmed deletion", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <DashboardWorkshopBookings
        bookings={bookings}
        onStatusChange={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeTruthy();
    expect(
      screen.getAllByLabelText("Send reminder to Noor Al-Hashemi")[0].getAttribute("href"),
    ).toContain("https://wa.me/970591234567?text=");
    expect(
      screen.getAllByLabelText("Message Noor Al-Hashemi on WhatsApp")[0].getAttribute("href"),
    ).toBe("https://wa.me/970591234567");

    fireEvent.click(screen.getAllByLabelText("Edit Noor Al-Hashemi")[0]);
    fireEvent.change(screen.getByLabelText("Participants"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onEdit).toHaveBeenCalledWith("workshop-booking-1", {
      fullName: "Noor Al-Hashemi",
      mobile: "+970591234567",
      email: "noor@example.com",
      date: "2026-07-13",
      participants: 4,
    });

    fireEvent.click(screen.getAllByLabelText("Delete Noor Al-Hashemi")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Delete booking" }));
    expect(onDelete).toHaveBeenCalledWith("workshop-booking-1");
  });
});
