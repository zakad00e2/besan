import { describe, expect, it } from "vitest";
import { formatBookingDate, parseBookingInput } from "./booking-domain";

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
