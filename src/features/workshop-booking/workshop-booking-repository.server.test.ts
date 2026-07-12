import { describe, expect, it, vi } from "vitest";
import type { ValidatedWorkshopBooking } from "./workshop-booking";
import {
  createWorkshopBookingRepository,
  type QueryExecutor,
} from "./workshop-booking-repository.server";

const validatedBooking: ValidatedWorkshopBooking = {
  workshopId: "mini-course",
  workshopName: "Private mini course",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  email: "noor@example.com",
  date: "2026-07-13",
  participants: 3,
  notes: "Vegetarian lunch",
};

const workshopBookingRow = {
  id: "workshop-booking-1",
  workshop_id: "mini-course",
  workshop_name: "Private mini course",
  full_name: "Noor Al-Hashemi",
  mobile: "+970591234567",
  email: "noor@example.com",
  workshop_date: "2026-07-13",
  participants: 3,
  notes: "Vegetarian lunch",
  status: "confirmed" as const,
  created_at: "2026-07-01T10:00:00.000Z",
  updated_at: "2026-07-02T10:00:00.000Z",
};

const mappedWorkshopBooking = {
  id: "workshop-booking-1",
  workshopId: "mini-course",
  workshopName: "Private mini course",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  email: "noor@example.com",
  date: "2026-07-13",
  participants: 3,
  notes: "Vegetarian lunch",
  status: "confirmed",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-02T10:00:00.000Z",
};

describe("workshop booking repository", () => {
  it("stores a validated workshop booking in a parameterized query", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([{ id: "workshop-booking-1" }]);

    await expect(
      createWorkshopBookingRepository(execute).create(validatedBooking),
    ).resolves.toEqual({
      id: "workshop-booking-1",
    });
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO public.workshop_bookings"),
      [
        "mini-course",
        "Private mini course",
        "Noor Al-Hashemi",
        "+970591234567",
        "noor@example.com",
        "2026-07-13",
        3,
        "Vegetarian lunch",
      ],
    );
  });

  it("maps workshop booking rows ordered by newest first", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([workshopBookingRow]);

    await expect(createWorkshopBookingRepository(execute).list()).resolves.toEqual([
      mappedWorkshopBooking,
    ]);
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("ORDER BY created_at DESC"));
  });

  it("updates a workshop booking status and maps the returned row", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([workshopBookingRow]);
    const repository = createWorkshopBookingRepository(execute);

    await expect(repository.updateStatus("workshop-booking-1", "confirmed")).resolves.toEqual({
      success: true,
      booking: mappedWorkshopBooking,
    });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("updated_at = now()"), [
      "workshop-booking-1",
      "confirmed",
    ]);
  });

  it("returns not-found when a status update affects no workshop booking", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([]);

    await expect(
      createWorkshopBookingRepository(execute).updateStatus("workshop-booking-1", "confirmed"),
    ).resolves.toEqual({ success: false, reason: "not-found" });
  });
});
