import { describe, expect, it, vi } from "vitest";
import { createBookingRepository, type QueryExecutor } from "./booking-repository.server";

const booking = {
  appointmentType: "First Fitting" as const,
  appointmentDate: "2026-07-13",
  appointmentTime: "10:00",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  notes: "Bring reference photos",
};

describe("booking repository", () => {
  it("upserts the customer and stores a booking in one parameterized query", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([{ id: "appointment-1" }]);
    const result = await createBookingRepository(execute).create(booking);

    expect(result).toEqual({ success: true, appointmentId: "appointment-1" });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT (mobile)"), [
      "Noor Al-Hashemi",
      "+970591234567",
      "First Fitting",
      "2026-07-13",
      "10:00",
      "Bring reference photos",
    ]);
  });

  it("translates an active-slot constraint error", async () => {
    const execute = vi.fn<QueryExecutor>().mockRejectedValue({
      code: "23505",
      constraint: "appointments_active_slot_unique",
    });

    await expect(createBookingRepository(execute).create(booking)).resolves.toEqual({
      success: false,
      reason: "slot-unavailable",
    });
  });

  it("maps live booking rows in descending appointment order", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([
      {
        id: "appointment-1",
        full_name: "Noor Al-Hashemi",
        mobile: "+970591234567",
        appointment_type: "First Fitting",
        appointment_date: "2026-07-13",
        appointment_time: "10:00",
        notes: "Bring reference photos",
        status: "pending",
        reminder_status: "not-scheduled",
        created_at: "2026-07-01T10:00:00.000Z",
      },
    ]);

    await expect(createBookingRepository(execute).list()).resolves.toEqual([
      {
        id: "appointment-1",
        fullName: "Noor Al-Hashemi",
        mobile: "+970591234567",
        appointmentType: "First Fitting",
        appointmentDate: "2026-07-13",
        appointmentTime: "10:00",
        notes: "Bring reference photos",
        status: "pending",
        reminderStatus: "not-scheduled",
        createdAt: "2026-07-01T10:00:00.000Z",
      },
    ]);
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("ORDER BY a.appointment_date DESC"));
  });
});
