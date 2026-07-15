import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSlotsForDate } = vi.hoisted(() => ({ getSlotsForDate: vi.fn() }));

vi.mock("@/features/availability/availability-service", () => ({ getSlotsForDate }));

import type { AvailabilityRepository } from "@/features/availability/availability-repository.server";
import { submitBookingRequest } from "./booking-service";

const validInput = {
  appointmentType: "First Fitting",
  appointmentDate: "2026-07-13",
  appointmentTime: "10:00",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  notes: "Bring reference photos",
};

const availabilityRepository = {} as AvailabilityRepository;

describe("submitBookingRequest", () => {
  beforeEach(() => {
    getSlotsForDate.mockReset();
    getSlotsForDate.mockResolvedValue({
      success: true,
      slots: [{ startsAt: validInput.appointmentTime, endsAt: "11:00" }],
    });
  });

  it("does not write invalid booking input", async () => {
    const create = vi.fn();

    await expect(
      submitBookingRequest({ ...validInput, mobile: "123" }, { create }, availabilityRepository),
    ).resolves.toMatchObject({
      success: false,
      reason: "validation",
      fieldErrors: { mobile: expect.any(String) },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns the stored appointment ID", async () => {
    const create = vi.fn().mockResolvedValue({ success: true, appointmentId: "appointment-1" });

    await expect(submitBookingRequest(validInput, { create }, availabilityRepository)).resolves.toEqual({
      success: true,
      appointmentId: "appointment-1",
    });
  });

  it("keeps a duplicate-slot error safe for the form", async () => {
    const create = vi.fn().mockResolvedValue({ success: false, reason: "slot-unavailable" });

    await expect(submitBookingRequest(validInput, { create }, availabilityRepository)).resolves.toEqual({
      success: false,
      reason: "slot-unavailable",
    });
  });

  it("does not expose unexpected storage errors", async () => {
    const create = vi.fn().mockRejectedValue(new Error("connection password leaked"));

    await expect(submitBookingRequest(validInput, { create }, availabilityRepository)).resolves.toEqual({
      success: false,
      reason: "storage-error",
    });
  });

  it("does not insert a closed or stale slot", async () => {
    const create = vi.fn();
    getSlotsForDate.mockResolvedValueOnce({ success: true, slots: [] });
    await expect(
      submitBookingRequest(
        validInput,
        { create },
        availabilityRepository,
        new Date("2026-07-01T09:00:00Z"),
      ),
    ).resolves.toEqual({ success: false, reason: "slot-unavailable" });
    expect(create).not.toHaveBeenCalled();
  });

  it("does not insert when canonical availability cannot be loaded", async () => {
    const create = vi.fn();
    getSlotsForDate.mockResolvedValueOnce({ success: false, reason: "load-error" });
    await expect(
      submitBookingRequest(validInput, { create }, availabilityRepository),
    ).resolves.toEqual({ success: false, reason: "storage-error" });
    expect(create).not.toHaveBeenCalled();
  });

  it("inserts after the canonical resolver returns the requested slot", async () => {
    const create = vi.fn().mockResolvedValue({ success: true, appointmentId: "appointment-1" });
    await expect(
      submitBookingRequest(validInput, { create }, availabilityRepository),
    ).resolves.toEqual({ success: true, appointmentId: "appointment-1" });
    expect(getSlotsForDate).toHaveBeenCalledWith(
      validInput.appointmentDate,
      availabilityRepository,
      expect.any(Date),
    );
    expect(create).toHaveBeenCalledOnce();
  });
});
