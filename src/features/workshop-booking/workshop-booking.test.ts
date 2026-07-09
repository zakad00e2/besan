import { describe, expect, it } from "vitest";
import {
  getTomorrowDateMinimum,
  parseWorkshopBooking,
  type WorkshopBookingFormValues,
} from "./workshop-booking";

const workshop = {
  id: "pattern-foundation",
  name: "Pattern foundation",
};

const validValues: WorkshopBookingFormValues = {
  fullName: "  Noor Al-Hashemi  ",
  mobile: " 0501234567 ",
  email: "",
  date: "2026-07-10",
  participants: "2",
  notes: "  First workshop booking  ",
};

describe("getTomorrowDateMinimum", () => {
  it("returns tomorrow in local YYYY-MM-DD format", () => {
    expect(getTomorrowDateMinimum(new Date(2026, 6, 9, 18, 30))).toBe("2026-07-10");
  });
});

describe("parseWorkshopBooking", () => {
  it.each(["2026-07-08", "2026-07-09"])("rejects non-future date %s", (date) => {
    const result = parseWorkshopBooking(
      workshop,
      { ...validValues, date },
      new Date(2026, 6, 9, 12),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.date).toBe("Choose a date after today.");
    }
  });

  it("accepts tomorrow", () => {
    const result = parseWorkshopBooking(workshop, validValues, new Date(2026, 6, 9, 12));

    expect(result.success).toBe(true);
  });

  it.each(["0", "-1", "1.5", "not-a-number"])(
    "rejects invalid participant count %s",
    (participants) => {
      const result = parseWorkshopBooking(
        workshop,
        { ...validValues, participants },
        new Date(2026, 6, 9, 12),
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.participants).toBe("Enter a whole number of at least 1.");
      }
    },
  );

  it("accepts a participant count without an upper limit", () => {
    const result = parseWorkshopBooking(
      workshop,
      { ...validValues, participants: "1000000" },
      new Date(2026, 6, 9, 12),
    );

    expect(result.success).toBe(true);
  });

  it("accepts an empty optional email and rejects a malformed email", () => {
    const emptyEmail = parseWorkshopBooking(
      workshop,
      validValues,
      new Date(2026, 6, 9, 12),
    );
    const malformedEmail = parseWorkshopBooking(
      workshop,
      { ...validValues, email: "noor@" },
      new Date(2026, 6, 9, 12),
    );

    expect(emptyEmail.success).toBe(true);
    expect(malformedEmail.success).toBe(false);
    if (!malformedEmail.success) {
      expect(malformedEmail.errors.email).toBe("Enter a valid email address.");
    }
  });

  it("normalizes the selected workshop and customer values", () => {
    const result = parseWorkshopBooking(workshop, validValues, new Date(2026, 6, 9, 12));

    expect(result).toEqual({
      success: true,
      data: {
        workshopId: "pattern-foundation",
        workshopName: "Pattern foundation",
        fullName: "Noor Al-Hashemi",
        mobile: "0501234567",
        date: "2026-07-10",
        participants: 2,
        notes: "First workshop booking",
      },
    });
  });

  it("requires a workshop, full name, mobile, and date", () => {
    const result = parseWorkshopBooking(
      null,
      {
        fullName: "",
        mobile: "",
        email: "",
        date: "",
        participants: "1",
        notes: "",
      },
      new Date(2026, 6, 9, 12),
    );

    expect(result).toEqual({
      success: false,
      errors: {
        workshop: "Choose a workshop.",
        fullName: "Enter your full name.",
        mobile: "Enter your mobile number.",
        date: "Choose a workshop date.",
      },
    });
  });
});
