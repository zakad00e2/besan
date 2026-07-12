import { describe, expect, it, vi } from "vitest";
import { submitWorkshopBookingRequest } from "./workshop-booking-service";

const validInput = {
  workshopId: "mini-course",
  workshopName: "Private mini course",
  fullName: "Noor Al-Hashemi",
  mobile: "+970 59 123 4567",
  email: "noor@example.com",
  date: "2026-07-13",
  participants: 3,
  notes: "Vegetarian lunch",
};

describe("submitWorkshopBookingRequest", () => {
  it("validates and persists a workshop booking request", async () => {
    const create = vi.fn().mockResolvedValue({ id: "workshop-booking-1" });

    await expect(submitWorkshopBookingRequest(validInput, { create })).resolves.toEqual({
      success: true,
      bookingId: "workshop-booking-1",
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mobile: "+970591234567" }));
  });

  it("returns field errors without persisting an invalid workshop booking", async () => {
    const create = vi.fn();

    await expect(
      submitWorkshopBookingRequest({ ...validInput, participants: 0 }, { create }),
    ).resolves.toMatchObject({ success: false, reason: "validation" });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns a safe failure when storage rejects a workshop booking", async () => {
    const create = vi.fn().mockRejectedValueOnce(new Error("offline"));

    await expect(submitWorkshopBookingRequest(validInput, { create })).resolves.toEqual({
      success: false,
      reason: "storage-error",
    });
  });
});
