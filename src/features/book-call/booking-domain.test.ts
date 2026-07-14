import { describe, expect, it } from "vitest";
import {
  formatBookingDate,
  getStageForNextAppointment,
  nextAppointmentTypes,
  parseBookingInput,
  parseScheduleNextAppointmentInput,
} from "./booking-domain";

const validBooking = {
  appointmentType: "First Fitting",
  appointmentDate: "2026-07-13",
  appointmentTime: "10:00",
  fullName: "  Noor Al-Hashemi  ",
  mobile: " +970 59-123-4567 ",
  notes: "  Bring reference photos  ",
};

describe("parseBookingInput", () => {
  it("normalizes a valid booking request", () => {
    expect(parseBookingInput(validBooking)).toEqual({
      success: true,
      data: {
        appointmentType: "First Fitting",
        appointmentDate: "2026-07-13",
        appointmentTime: "10:00",
        fullName: "Noor Al-Hashemi",
        mobile: "+970591234567",
        notes: "Bring reference photos",
      },
    });
  });

  it("rejects dates that do not have bookable times", () => {
    expect(parseBookingInput({ ...validBooking, appointmentDate: "2026-07-12" })).toMatchObject({
      success: false,
      fieldErrors: { appointmentDate: expect.any(String) },
    });
  });

  it("rejects a time unavailable on the selected day", () => {
    expect(parseBookingInput({ ...validBooking, appointmentTime: "11:15" })).toMatchObject({
      success: false,
      fieldErrors: { appointmentTime: expect.any(String) },
    });
  });

  it("rejects malformed request fields", () => {
    expect(
      parseBookingInput({
        ...validBooking,
        appointmentType: "Consultation",
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

describe("formatBookingDate", () => {
  it("formats a local calendar date without converting it to UTC", () => {
    expect(formatBookingDate(new Date(2026, 6, 13))).toBe("2026-07-13");
  });
});

describe("next appointment workflow", () => {
  const input = {
    currentAppointmentId: "11111111-1111-4111-8111-111111111111",
    appointmentType: "Measurements",
    appointmentDate: "2026-07-20",
    appointmentTime: "13:30",
    notes: "  Bring the selected shoes  ",
    reminderStatus: "scheduled",
  };

  it("adds Measurements only to the administrator workflow", () => {
    expect(nextAppointmentTypes).toContain("Measurements");
    expect(parseBookingInput({ ...validBooking, appointmentType: "Measurements" })).toMatchObject({
      success: false,
      fieldErrors: { appointmentType: expect.any(String) },
    });
  });

  it("normalizes a valid next appointment", () => {
    expect(parseScheduleNextAppointmentInput(input)).toEqual({
      success: true,
      data: { ...input, notes: "Bring the selected shoes" },
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
    ["New Design", "initial-appointment"],
    ["Measurements", "measurements-appointment"],
    ["First Fitting", "fitting"],
    ["Second Fitting", "fitting"],
    ["Alteration", "fitting"],
    ["Pickup", "ready-delivery"],
  ] as const)("maps %s to %s", (appointmentType, stage) => {
    expect(getStageForNextAppointment(appointmentType)).toBe(stage);
  });
});
