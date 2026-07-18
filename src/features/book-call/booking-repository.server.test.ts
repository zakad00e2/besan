import { describe, expect, it, vi } from "vitest";
import { createBookingRepository, type QueryExecutor } from "./booking-repository.server";

const booking = {
  appointmentType: "Custom Design" as const,
  appointmentDate: "2026-07-13",
  appointmentTime: "10:00",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  notes: "Bring reference photos",
};

const adminBooking = {
  customerId: "22222222-2222-4222-8222-222222222222",
  appointmentType: "First Fitting" as const,
  appointmentDate: "2026-07-19",
  appointmentTime: "11:00",
  notes: "Bring shoes",
  status: "confirmed" as const,
  reminderStatus: "scheduled" as const,
};

const adminBookingCreate = {
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  appointmentType: "First Fitting" as const,
  appointmentDate: "2026-07-19",
  appointmentTime: "11:00",
  notes: "Bring shoes",
  status: "confirmed" as const,
  reminderStatus: "scheduled" as const,
};

const adminRow = {
  id: "11111111-1111-4111-8111-111111111111",
  customer_id: adminBooking.customerId,
  full_name: "Noor Al-Hashemi",
  mobile: "+970591234567",
  customer_stage: "fitting" as const,
  customer_created_at: "2026-06-20T08:00:00.000Z",
  customer_updated_at: "2026-07-01T09:00:00.000Z",
  appointment_type: adminBooking.appointmentType,
  appointment_date: adminBooking.appointmentDate,
  appointment_time: adminBooking.appointmentTime,
  notes: adminBooking.notes,
  status: adminBooking.status,
  reminder_status: adminBooking.reminderStatus,
  created_at: "2026-07-16T09:00:00.000Z",
};

describe("booking repository", () => {
  it("upserts the customer and stores a booking in one parameterized query", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([{ id: "appointment-1" }]);
    const result = await createBookingRepository(execute).create(booking);

    expect(result).toEqual({ success: true, appointmentId: "appointment-1" });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT (mobile)"), [
      "Noor Al-Hashemi",
      "+970591234567",
      "Custom Design",
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
        customer_id: "22222222-2222-4222-8222-222222222222",
        full_name: "Noor Al-Hashemi",
        mobile: "+970591234567",
        customer_stage: "new-inquiry",
        customer_created_at: "2026-06-20T08:00:00.000Z",
        customer_updated_at: "2026-07-01T09:00:00.000Z",
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
        customerId: "22222222-2222-4222-8222-222222222222",
        fullName: "Noor Al-Hashemi",
        mobile: "+970591234567",
        customerStage: "new-inquiry",
        customerCreatedAt: "2026-06-20T08:00:00.000Z",
        customerUpdatedAt: "2026-07-01T09:00:00.000Z",
        appointmentType: "First Fitting",
        appointmentDate: "2026-07-13",
        appointmentTime: "10:00",
        notes: "Bring reference photos",
        status: "pending",
        reminderStatus: "not-scheduled",
        createdAt: "2026-07-01T10:00:00.000Z",
      },
    ]);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY a.appointment_date DESC"),
    );
  });

  it("updates a booking status and returns the updated booking", async () => {
    const row = {
      id: "appointment-1",
      customer_id: "22222222-2222-4222-8222-222222222222",
      full_name: "Noor Al-Hashemi",
      mobile: "+970591234567",
      customer_stage: "new-inquiry",
      customer_created_at: "2026-06-20T08:00:00.000Z",
      customer_updated_at: "2026-07-01T09:00:00.000Z",
      appointment_type: "First Fitting" as const,
      appointment_date: "2026-07-13",
      appointment_time: "10:00",
      notes: "Bring reference photos",
      status: "confirmed" as const,
      reminder_status: "not-scheduled" as const,
      created_at: "2026-07-01T10:00:00.000Z",
    };
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([row]);

    await expect(
      createBookingRepository(execute).updateStatus("appointment-1", "confirmed"),
    ).resolves.toEqual({
      success: true,
      booking: {
        id: "appointment-1",
        customerId: "22222222-2222-4222-8222-222222222222",
        fullName: "Noor Al-Hashemi",
        mobile: "+970591234567",
        customerStage: "new-inquiry",
        customerCreatedAt: "2026-06-20T08:00:00.000Z",
        customerUpdatedAt: "2026-07-01T09:00:00.000Z",
        appointmentType: "First Fitting",
        appointmentDate: "2026-07-13",
        appointmentTime: "10:00",
        notes: "Bring reference photos",
        status: "confirmed",
        reminderStatus: "not-scheduled",
        createdAt: "2026-07-01T10:00:00.000Z",
      },
    });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("UPDATE public.appointments"), [
      "appointment-1",
      "confirmed",
    ]);
  });

  it("deletes a booking by its id", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([{ id: "appointment-1" }]);

    await expect(createBookingRepository(execute).delete("appointment-1")).resolves.toEqual({
      success: true,
    });
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM public.appointments"),
      ["appointment-1"],
    );
  });

  it("marks a booking reminder as sent", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([{ id: "appointment-1" }]);

    await expect(
      createBookingRepository(execute).updateReminderStatus("appointment-1", "sent"),
    ).resolves.toEqual({ success: true });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("SET reminder_status = $2"), [
      "appointment-1",
      "sent",
    ]);
  });

  const nextInput = {
    currentAppointmentId: "11111111-1111-4111-8111-111111111111",
    appointmentType: "Final Fitting & Pickup" as const,
    appointmentDate: "2026-07-20",
    appointmentTime: "13:30",
    notes: "Bring the selected shoes",
    reminderStatus: "scheduled" as const,
  };

  it("completes the current appointment, inserts the next one, and updates the customer atomically", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([
      {
        outcome: "success",
        customer_id: "22222222-2222-4222-8222-222222222222",
        full_name: "Noor Al-Hashemi",
        mobile: "+970591234567",
        customer_stage: "ready-delivery",
        customer_created_at: "2026-06-20T08:00:00.000Z",
        customer_updated_at: "2026-07-14T10:00:00.000Z",
        current_id: nextInput.currentAppointmentId,
        current_appointment_type: "New Design",
        current_appointment_date: "2026-07-14",
        current_appointment_time: "10:00",
        current_notes: "Initial sketches",
        current_status: "completed",
        current_reminder_status: "sent",
        current_created_at: "2026-07-01T10:00:00.000Z",
        next_id: "33333333-3333-4333-8333-333333333333",
        next_appointment_type: "Final Fitting & Pickup",
        next_appointment_date: "2026-07-20",
        next_appointment_time: "13:30",
        next_notes: "Bring the selected shoes",
        next_status: "confirmed",
        next_reminder_status: "scheduled",
        next_created_at: "2026-07-14T10:00:00.000Z",
      },
    ]);

    const result = await createBookingRepository(execute).scheduleNextAppointment(nextInput);

    expect(result).toMatchObject({
      success: true,
      currentBooking: { id: nextInput.currentAppointmentId, status: "completed" },
      nextBooking: {
        id: "33333333-3333-4333-8333-333333333333",
        customerId: "22222222-2222-4222-8222-222222222222",
        appointmentType: "Final Fitting & Pickup",
        customerStage: "ready-delivery",
        status: "confirmed",
      },
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.stringMatching(
        /WITH[\s\S]+INSERT INTO public\.appointments[\s\S]+UPDATE public\.appointments[\s\S]+UPDATE public\.customers/,
      ),
      [
        nextInput.currentAppointmentId,
        "Final Fitting & Pickup",
        "2026-07-20",
        "13:30",
        "Bring the selected shoes",
        "scheduled",
        "ready-delivery",
      ],
    );
  });

  it.each(["not-found", "cancelled"] as const)(
    "returns %s without a partial result",
    async (outcome) => {
      const execute = vi.fn<QueryExecutor>().mockResolvedValue([{ outcome }]);
      await expect(
        createBookingRepository(execute).scheduleNextAppointment(nextInput),
      ).resolves.toEqual({
        success: false,
        reason: outcome,
      });
      expect(execute).toHaveBeenCalledTimes(1);
    },
  );

  it("maps a next-appointment slot conflict", async () => {
    const execute = vi.fn<QueryExecutor>().mockRejectedValue({
      code: "23505",
      constraint: "appointments_active_slot_unique",
    });
    await expect(
      createBookingRepository(execute).scheduleNextAppointment(nextInput),
    ).resolves.toEqual({
      success: false,
      reason: "slot-unavailable",
    });
  });

  it("maps the 60-minute overlap exclusion constraint", async () => {
    const execute = vi.fn<QueryExecutor>().mockRejectedValue({
      code: "23P01",
      constraint: "appointments_active_time_overlap",
    });
    await expect(createBookingRepository(execute).create(booking)).resolves.toEqual({
      success: false,
      reason: "slot-unavailable",
    });
  });

  it("upserts an admin customer and returns the joined appointment row", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([adminRow]);

    await expect(
      createBookingRepository(execute).createForAdmin(adminBookingCreate),
    ).resolves.toMatchObject({
      success: true,
      booking: {
        id: adminRow.id,
        customerCreatedAt: adminRow.customer_created_at,
        appointmentDate: adminBookingCreate.appointmentDate,
      },
    });
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (mobile)"),
      [
        adminBookingCreate.fullName,
        adminBookingCreate.mobile,
        adminBookingCreate.appointmentType,
        adminBookingCreate.appointmentDate,
        adminBookingCreate.appointmentTime,
        adminBookingCreate.notes,
        adminBookingCreate.status,
        adminBookingCreate.reminderStatus,
      ],
    );
  });

  it("updates an admin appointment with a parameterized query", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([adminRow]);

    await expect(
      createBookingRepository(execute).updateForAdmin(adminRow.id, adminBooking),
    ).resolves.toMatchObject({ success: true, booking: { id: adminRow.id } });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("UPDATE public.appointments"), [
      adminRow.id,
      adminBooking.customerId,
      adminBooking.appointmentType,
      adminBooking.appointmentDate,
      adminBooking.appointmentTime,
      adminBooking.notes,
      adminBooking.status,
      adminBooking.reminderStatus,
    ]);
  });

  it.each(["createForAdmin", "updateForAdmin"] as const)(
    "returns safe %s outcomes for missing rows and slot conflicts",
    async (method) => {
      const missingExecute = vi.fn<QueryExecutor>().mockResolvedValue([]);
      const missingRepository = createBookingRepository(missingExecute);
      const missing =
        method === "createForAdmin"
          ? await missingRepository.createForAdmin(adminBookingCreate)
          : await missingRepository.updateForAdmin(adminRow.id, adminBooking);
      expect(missing).toEqual({ success: false, reason: "not-found" });

      const conflictExecute = vi.fn<QueryExecutor>().mockRejectedValue({
        code: "23P01",
        constraint: "appointments_active_time_overlap",
      });
      const conflictRepository = createBookingRepository(conflictExecute);
      const conflict =
        method === "createForAdmin"
          ? await conflictRepository.createForAdmin(adminBookingCreate)
          : await conflictRepository.updateForAdmin(adminRow.id, adminBooking);
      expect(conflict).toEqual({ success: false, reason: "slot-unavailable" });
    },
  );
});
