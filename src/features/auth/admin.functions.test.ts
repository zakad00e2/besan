import { describe, expect, it, vi } from "vitest";
import type { WorkshopBookingListItem } from "@/features/workshop-booking/workshop-booking";
import type { BookingListItem } from "@/features/book-call/booking-domain";
import {
  changeBookingStatusForAdmin,
  changeWorkshopBookingStatusForAdmin,
  deleteWorkshopBookingForAdmin,
  deleteBookingForAdmin,
  listBookingsForAdmin,
  listWorkshopBookingsForAdmin,
  markBookingReminderSentForAdmin,
  scheduleNextAppointmentForAdmin,
  updateWorkshopBookingForAdmin,
} from "./admin.functions";

const appointment: BookingListItem = {
  id: "appointment-1",
  appointmentType: "First Fitting",
  appointmentDate: "2026-07-13",
  appointmentTime: "10:00",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  notes: "Bring reference photos",
  customerId: "22222222-2222-4222-8222-222222222222",
  customerStage: "fitting",
  customerUpdatedAt: "2026-07-01T10:00:00.000Z",
  status: "pending",
  reminderStatus: "not-scheduled",
  createdAt: "2026-07-01T10:00:00.000Z",
};

function bookingDependencies(allowed = true) {
  return {
    verifyAdminToken: vi.fn().mockResolvedValue({ allowed }),
    repository: {
      list: vi.fn().mockResolvedValue([appointment]),
      updateStatus: vi.fn().mockResolvedValue({ success: true, booking: appointment }),
      updateReminderStatus: vi.fn().mockResolvedValue({ success: true }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      scheduleNextAppointment: vi.fn().mockResolvedValue({
        success: true,
        currentBooking: { ...appointment, status: "completed" },
        nextBooking: {
          ...appointment,
          id: "33333333-3333-4333-8333-333333333333",
          appointmentType: "Measurements",
          appointmentDate: "2026-07-20",
          appointmentTime: "13:30",
          customerStage: "measurements-appointment",
          status: "confirmed",
          reminderStatus: "scheduled",
        },
      }),
    },
  };
}

const scheduleInput = {
  currentAppointmentId: "11111111-1111-4111-8111-111111111111",
  appointmentType: "Measurements",
  appointmentDate: "2026-07-20",
  appointmentTime: "13:30",
  notes: "Bring shoes",
  reminderStatus: "scheduled",
};

describe("booking admin functions", () => {
  it("lists bookings and only updates a valid status for an admin", async () => {
    const testDependencies = bookingDependencies();

    await expect(listBookingsForAdmin("admin-token", testDependencies)).resolves.toEqual({
      success: true,
      bookings: [appointment],
    });
    await expect(
      changeBookingStatusForAdmin(
        { token: "admin-token", id: appointment.id, status: "confirmed" },
        testDependencies,
      ),
    ).resolves.toEqual({ success: true, booking: appointment });
    expect(testDependencies.repository.updateStatus).toHaveBeenCalledWith(
      appointment.id,
      "confirmed",
    );
  });

  it("records the underlying error when loading design bookings fails", async () => {
    const testDependencies = bookingDependencies();
    const failure = new Error("database unavailable");
    testDependencies.repository.list.mockRejectedValueOnce(failure);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(listBookingsForAdmin("admin-token", testDependencies)).resolves.toEqual({
      success: false,
      reason: "load-error",
    });
    expect(errorSpy).toHaveBeenCalledWith("Failed to load design bookings.", failure);

    errorSpy.mockRestore();
  });

  it("rejects forbidden and invalid status changes", async () => {
    const forbiddenDependencies = bookingDependencies(false);
    await expect(
      changeBookingStatusForAdmin(
        { token: "invalid-token", id: appointment.id, status: "confirmed" },
        forbiddenDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "forbidden" });
    expect(forbiddenDependencies.repository.updateStatus).not.toHaveBeenCalled();

    const testDependencies = bookingDependencies();
    await expect(
      changeBookingStatusForAdmin(
        { token: "admin-token", id: appointment.id, status: "refunded" },
        testDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "invalid-status" });
    expect(testDependencies.repository.updateStatus).not.toHaveBeenCalled();
  });

  it("only deletes a booking for an admin", async () => {
    const testDependencies = bookingDependencies();

    await expect(
      deleteBookingForAdmin({ token: "admin-token", id: appointment.id }, testDependencies),
    ).resolves.toEqual({ success: true });
    expect(testDependencies.repository.delete).toHaveBeenCalledWith(appointment.id);

    const forbiddenDependencies = bookingDependencies(false);
    await expect(
      deleteBookingForAdmin({ token: "invalid-token", id: appointment.id }, forbiddenDependencies),
    ).resolves.toEqual({ success: false, reason: "forbidden" });
    expect(forbiddenDependencies.repository.delete).not.toHaveBeenCalled();
  });

  it("marks a reminder as sent only for an admin", async () => {
    const testDependencies = bookingDependencies();

    await expect(
      markBookingReminderSentForAdmin(
        { token: "admin-token", id: appointment.id },
        testDependencies,
      ),
    ).resolves.toEqual({ success: true });
    expect(testDependencies.repository.updateReminderStatus).toHaveBeenCalledWith(
      appointment.id,
      "sent",
    );
  });

  it("schedules a validated next appointment for an admin", async () => {
    const testDependencies = bookingDependencies();
    const result = await scheduleNextAppointmentForAdmin(
      { token: "admin-token", input: scheduleInput },
      testDependencies,
    );
    expect(result).toMatchObject({
      success: true,
      nextBooking: { appointmentType: "Measurements" },
    });
    expect(testDependencies.repository.scheduleNextAppointment).toHaveBeenCalledWith(scheduleInput);
  });

  it("rejects forbidden and invalid next-appointment requests before repository access", async () => {
    const forbiddenDependencies = bookingDependencies(false);
    await expect(
      scheduleNextAppointmentForAdmin(
        { token: "invalid-token", input: scheduleInput },
        forbiddenDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "forbidden" });
    expect(forbiddenDependencies.repository.scheduleNextAppointment).not.toHaveBeenCalled();

    const invalidDependencies = bookingDependencies();
    const result = await scheduleNextAppointmentForAdmin(
      { token: "admin-token", input: { ...scheduleInput, appointmentTime: "afternoon" } },
      invalidDependencies,
    );
    expect(result).toMatchObject({
      success: false,
      reason: "validation",
      fieldErrors: { appointmentTime: expect.any(String) },
    });
    expect(invalidDependencies.repository.scheduleNextAppointment).not.toHaveBeenCalled();
  });

  it("maps unexpected scheduling failures to storage-error", async () => {
    const testDependencies = bookingDependencies();
    testDependencies.repository.scheduleNextAppointment.mockRejectedValueOnce(new Error("offline"));
    await expect(
      scheduleNextAppointmentForAdmin(
        { token: "admin-token", input: scheduleInput },
        testDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "storage-error" });
  });
});

const booking: WorkshopBookingListItem = {
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
};

function dependencies(allowed = true) {
  return {
    verifyAdminToken: vi.fn().mockResolvedValue({ allowed }),
    repository: {
      list: vi.fn().mockResolvedValue([booking]),
      updateStatus: vi.fn().mockResolvedValue({ success: true, booking }),
      update: vi.fn().mockResolvedValue({ success: true, booking: { ...booking, fullName: "Noor Khalil" } }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  };
}

const workshopUpdateInput = {
  fullName: "Noor Khalil",
  mobile: "+970591234567",
  email: "noor@example.com",
  date: "2026-07-13",
  participants: 4,
};

describe("workshop booking admin functions", () => {
  it("does not list workshop bookings for a forbidden token", async () => {
    const testDependencies = dependencies(false);

    await expect(listWorkshopBookingsForAdmin("invalid-token", testDependencies)).resolves.toEqual({
      success: false,
      reason: "forbidden",
    });
    expect(testDependencies.repository.list).not.toHaveBeenCalled();
  });

  it("does not resolve the default repository before rejecting a forbidden token", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousAuthUrl = process.env.VITE_NEON_AUTH_URL;
    delete process.env.DATABASE_URL;
    process.env.VITE_NEON_AUTH_URL = "https://auth.example.test";

    try {
      await expect(listWorkshopBookingsForAdmin("invalid-token")).resolves.toEqual({
        success: false,
        reason: "forbidden",
      });
      await expect(
        changeWorkshopBookingStatusForAdmin({
          token: "invalid-token",
          id: booking.id,
          status: "confirmed",
        }),
      ).resolves.toEqual({ success: false, reason: "forbidden" });
    } finally {
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
      if (previousAuthUrl === undefined) delete process.env.VITE_NEON_AUTH_URL;
      else process.env.VITE_NEON_AUTH_URL = previousAuthUrl;
    }
  });

  it("lists workshop bookings after verifying an admin token", async () => {
    const testDependencies = dependencies();

    await expect(listWorkshopBookingsForAdmin("admin-token", testDependencies)).resolves.toEqual({
      success: true,
      bookings: [booking],
    });
    expect(testDependencies.repository.list).toHaveBeenCalledOnce();
  });

  it("maps repository listing failures to load-error", async () => {
    const testDependencies = dependencies();
    testDependencies.repository.list.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(listWorkshopBookingsForAdmin("admin-token", testDependencies)).resolves.toEqual({
      success: false,
      reason: "load-error",
    });
  });

  it("does not update when an admin token is forbidden", async () => {
    const testDependencies = dependencies(false);

    await expect(
      changeWorkshopBookingStatusForAdmin(
        { token: "invalid-token", id: booking.id, status: "confirmed" },
        testDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "forbidden" });
    expect(testDependencies.repository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects invalid status values before updating a booking", async () => {
    const testDependencies = dependencies();

    await expect(
      changeWorkshopBookingStatusForAdmin(
        { token: "admin-token", id: booking.id, status: "refunded" },
        testDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "invalid-status" });
    expect(testDependencies.verifyAdminToken).toHaveBeenCalledWith("admin-token");
    expect(testDependencies.repository.updateStatus).not.toHaveBeenCalled();
  });

  it("returns not-found when no workshop booking is updated", async () => {
    const testDependencies = dependencies();
    testDependencies.repository.updateStatus.mockResolvedValueOnce({
      success: false,
      reason: "not-found",
    });

    await expect(
      changeWorkshopBookingStatusForAdmin(
        { token: "admin-token", id: booking.id, status: "confirmed" },
        testDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "not-found" });
  });

  it("maps repository update failures to update-error", async () => {
    const testDependencies = dependencies();
    testDependencies.repository.updateStatus.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    await expect(
      changeWorkshopBookingStatusForAdmin(
        { token: "admin-token", id: booking.id, status: "confirmed" },
        testDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "update-error" });
  });

  it("updates editable workshop fields only after verifying an admin token", async () => {
    const testDependencies = dependencies();

    await expect(
      updateWorkshopBookingForAdmin(
        { token: "admin-token", id: booking.id, input: workshopUpdateInput },
        testDependencies,
      ),
    ).resolves.toEqual({ success: true, booking: { ...booking, fullName: "Noor Khalil" } });
    expect(testDependencies.repository.update).toHaveBeenCalledWith(booking.id, workshopUpdateInput);
  });

  it("rejects invalid workshop edits and forbidden workshop deletion", async () => {
    const invalidDependencies = dependencies();
    await expect(
      updateWorkshopBookingForAdmin(
        { token: "admin-token", id: booking.id, input: { ...workshopUpdateInput, participants: 0 } },
        invalidDependencies,
      ),
    ).resolves.toMatchObject({ success: false, reason: "validation" });
    expect(invalidDependencies.repository.update).not.toHaveBeenCalled();

    const forbiddenDependencies = dependencies(false);
    await expect(
      deleteWorkshopBookingForAdmin({ token: "invalid-token", id: booking.id }, forbiddenDependencies),
    ).resolves.toEqual({ success: false, reason: "forbidden" });
    expect(forbiddenDependencies.repository.delete).not.toHaveBeenCalled();
  });
});
