import { describe, expect, it, vi } from "vitest";
import { submitBookingRequest } from "./booking-service";

const validInput = {
  appointmentType: "First Fitting",
  appointmentDate: "2026-07-13",
  appointmentTime: "10:00",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  notes: "Bring reference photos",
};

describe("submitBookingRequest", () => {
  it("does not write invalid booking input", async () => {
    const create = vi.fn();

    await expect(submitBookingRequest({ ...validInput, mobile: "123" }, { create })).resolves.toMatchObject({
      success: false,
      reason: "validation",
      fieldErrors: { mobile: expect.any(String) },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns the stored appointment ID", async () => {
    const create = vi.fn().mockResolvedValue({ success: true, appointmentId: "appointment-1" });

    await expect(submitBookingRequest(validInput, { create })).resolves.toEqual({
      success: true,
      appointmentId: "appointment-1",
    });
  });

  it("keeps a duplicate-slot error safe for the form", async () => {
    const create = vi.fn().mockResolvedValue({ success: false, reason: "slot-unavailable" });

    await expect(submitBookingRequest(validInput, { create })).resolves.toEqual({
      success: false,
      reason: "slot-unavailable",
    });
  });

  it("does not expose unexpected storage errors", async () => {
    const create = vi.fn().mockRejectedValue(new Error("connection password leaked"));

    await expect(submitBookingRequest(validInput, { create })).resolves.toEqual({
      success: false,
      reason: "storage-error",
    });
  });
});
