import { describe, expect, it } from "vitest";
import {
  appointmentTypes,
  formatBookingDate,
  getStageForNextAppointment,
  nextAppointmentTypes,
  parseAdminBookingCreateInput,
  parseAdminBookingInput,
  parseBookingInput,
  parseScheduleNextAppointmentInput,
} from "./booking-domain";

const validBooking = {
  appointmentType: "Custom Design",
  appointmentDate: "2026-07-13",
  appointmentTime: "10:00",
  fullName: "  Noor Al-Hashemi  ",
  mobile: " +970 59-123-4567 ",
  notes: "  Bring reference photos  ",
};

const adminInput = {
  customerId: "22222222-2222-4222-8222-222222222222",
  appointmentType: "First Fitting",
  appointmentDate: "2026-07-19",
  appointmentTime: "11:00",
  notes: "  Bring shoes  ",
  status: "confirmed",
  reminderStatus: "scheduled",
};

const adminCreateInput = {
  fullName: "  Noor Al-Hashemi  ",
  mobile: " +970 59-123-4567 ",
  appointmentType: "First Fitting",
  appointmentDate: "2026-07-19",
  appointmentTime: "11:00",
  notes: "  Bring shoes  ",
  status: "confirmed",
  reminderStatus: "scheduled",
};

describe("parseBookingInput", () => {
  it("normalizes a valid booking request", () => {
    expect(parseBookingInput(validBooking)).toEqual({
      success: true,
      data: {
        appointmentType: "Custom Design",
        appointmentDate: "2026-07-13",
        appointmentTime: "10:00",
        fullName: "Noor Al-Hashemi",
        mobile: "+970591234567",
        notes: "Bring reference photos",
      },
    });
  });

  it("accepts a well-formed date and time for authoritative availability validation", () => {
    expect(
      parseBookingInput({
        ...validBooking,
        appointmentDate: "2026-07-16",
        appointmentTime: "11:30",
      }),
    ).toMatchObject({
      success: true,
      data: { appointmentDate: "2026-07-16", appointmentTime: "11:30" },
    });
  });

  it("rejects malformed request fields", () => {
    expect(
      parseBookingInput({
        ...validBooking,
        appointmentType: "First Fitting",
        fullName: "",
        mobile: "123",
        notes: "x".repeat(1001),
      }),
    ).toMatchObject({
      success: false,
      fieldErrors: {
        appointmentType: expect.any(String),
        fullName: expect.any(String),
        mobile: expect.any(String),
        notes: expect.any(String),
      },
    });
  });
});

describe("parseAdminBookingInput", () => {
  it("parses and normalizes an administrator appointment", () => {
    expect(parseAdminBookingInput(adminInput)).toEqual({
      success: true,
      data: { ...adminInput, notes: "Bring shoes" },
    });
  });

  it("accepts the public appointment purposes in the administrator workflow", () => {
    expect(
      parseAdminBookingInput({ ...adminInput, appointmentType: "Custom Design" }),
    ).toMatchObject({
      success: true,
      data: { appointmentType: "Custom Design" },
    });
  });

  it("rejects invalid customer, appointment type, status, reminder, and notes", () => {
    const result = parseAdminBookingInput({
      ...adminInput,
      customerId: "not-a-uuid",
      appointmentType: "Workshop",
      status: "refunded",
      reminderStatus: "queued",
      notes: "x".repeat(1001),
    });

    expect(result).toMatchObject({ success: false });
    if (!result.success) {
      expect(result.fieldErrors).toMatchObject({
        customerId: expect.any(String),
        appointmentType: expect.any(String),
        status: expect.any(String),
        reminderStatus: expect.any(String),
        notes: expect.any(String),
      });
    }
  });
});

describe("parseAdminBookingCreateInput", () => {
  it("parses a new customer with the administrator appointment", () => {
    expect(parseAdminBookingCreateInput(adminCreateInput)).toEqual({
      success: true,
      data: {
        ...adminCreateInput,
        fullName: "Noor Al-Hashemi",
        mobile: "+970 59-123-4567",
        notes: "Bring shoes",
      },
    });
  });

  it("requires a customer name and phone number", () => {
    const result = parseAdminBookingCreateInput({ ...adminCreateInput, fullName: "", mobile: "" });
    expect(result).toMatchObject({
      success: false,
      fieldErrors: { fullName: expect.any(String), mobile: expect.any(String) },
    });
  });
});

describe("formatBookingDate", () => {
  it("formats a local calendar date without converting it to UTC", () => {
    expect(formatBookingDate(new Date(2026, 6, 13))).toBe("2026-07-13");
  });
});

describe("next appointment workflow", () => {
  const input = {
    currentAppointmentId: "11111111-1111-4111-8111-111111111111",
    appointmentType: "Initial Consultation",
    appointmentDate: "2026-07-20",
    appointmentTime: "13:30",
    notes: "  Bring the selected shoes  ",
    reminderStatus: "scheduled",
  };

  it("keeps public choices unchanged and exposes exactly four next-appointment stages", () => {
    expect(appointmentTypes).toEqual(["Custom Design", "Consultation", "Dresses for Rent"]);
    expect(nextAppointmentTypes).toEqual([
      "Initial Consultation",
      "First Fitting",
      "Second Fitting",
      "Final Fitting & Pickup",
    ]);
    expect(parseBookingInput({ ...validBooking, appointmentType: "Initial Consultation" })).toMatchObject({
      success: false,
      fieldErrors: { appointmentType: expect.any(String) },
    });
  });

  it.each([
    "Initial Consultation",
    "First Fitting",
    "Second Fitting",
    "Final Fitting & Pickup",
  ] as const)("accepts the %s next-appointment stage", (appointmentType) => {
    expect(parseScheduleNextAppointmentInput({ ...input, appointmentType })).toEqual({
      success: true,
      data: { ...input, appointmentType, notes: "Bring the selected shoes" },
    });
  });

  it.each(["New Design", "Measurements", "Alteration", "Pickup"])(
    "rejects removed %s values in the schedule-next workflow",
    (appointmentType) => {
      expect(parseScheduleNextAppointmentInput({ ...input, appointmentType })).toMatchObject({
        success: false,
        fieldErrors: { appointmentType: expect.any(String) },
      });
    },
  );

  it("keeps a removed value valid for general administrator compatibility", () => {
    expect(parseAdminBookingInput({ ...adminInput, appointmentType: "Measurements" })).toMatchObject({
      success: true,
      data: { appointmentType: "Measurements" },
    });
  });

  it("rejects invalid identifiers, dates, times, notes, and reminder values", () => {
    expect(
      parseScheduleNextAppointmentInput({
        ...input,
        currentAppointmentId: "appointment-1",
        appointmentDate: "20-07-2026",
        appointmentTime: "1pm",
        notes: "x".repeat(1001),
        reminderStatus: "emailed",
      }),
    ).toMatchObject({
      success: false,
      fieldErrors: {
        currentAppointmentId: expect.any(String),
        appointmentDate: expect.any(String),
        appointmentTime: expect.any(String),
        notes: expect.any(String),
        reminderStatus: expect.any(String),
      },
    });
  });

  it.each([
    ["Initial Consultation", "initial-appointment"],
    ["First Fitting", "fitting"],
    ["Second Fitting", "fitting"],
    ["Final Fitting & Pickup", "ready-delivery"],
  ] as const)("maps %s to %s", (appointmentType, stage) => {
    expect(getStageForNextAppointment(appointmentType)).toBe(stage);
  });
});
