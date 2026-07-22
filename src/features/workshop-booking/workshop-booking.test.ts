import { describe, expect, it } from "vitest";
import {
  getTomorrowDateMinimum,
  parseWorkshopBookingAdminUpdate,
  parseWorkshopBooking,
  parseWorkshopBookingInput,
  parseWorkshopBookingStatus,
  type WorkshopBookingFormValues,
  workshopOptions,
} from "./workshop-booking";

const workshop = workshopOptions[2];

const validValues: WorkshopBookingFormValues = {
  fullName: "  Noor Al-Hashemi  ",
  mobile: " 0501234567 ",
  email: "",
  date: "2026-07-10",
  participants: "2",
  notes: "  First workshop booking  ",
};

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

const validAdminInput = {
  fullName: "Noor Khalil",
  mobile: "+970 59 123 4567",
  email: "noor@example.com",
  date: "2026-07-13",
  participants: 4,
};

describe("parseWorkshopBookingInput", () => {
  it("normalizes an assigned date away from a customer submission for a supervisor-assigned workshop", () => {
    expect(parseWorkshopBookingInput(validInput, new Date("2026-07-12T08:00:00Z"))).toEqual({
      success: true,
      data: { ...validInput, mobile: "+970591234567", date: null },
    });
  });

  it.each([
    ["pattern-foundation", "Pattern foundation"],
    ["mini-course", "Private mini course"],
  ])("normalizes a customer date to null for %s", (workshopId, workshopName) => {
    expect(
      parseWorkshopBookingInput(
        { ...validInput, workshopId, workshopName, date: "2026-08-20" },
        new Date(2026, 6, 12, 8),
      ),
    ).toMatchObject({ success: true, data: { date: null } });
  });

  it("requires a future customer date for the corset workshop", () => {
    expect(
      parseWorkshopBookingInput(
        {
          ...validInput,
          workshopId: "corset-workshop",
          workshopName: workshop.name,
          date: null,
        },
        new Date(2026, 6, 12, 8),
      ),
    ).toMatchObject({ success: false, errors: { date: "Choose a workshop date." } });
  });

  it("rejects unknown and mismatched workshops", () => {
    expect(
      parseWorkshopBookingInput(
        { ...validInput, workshopName: "Invented workshop" },
        new Date("2026-07-12T08:00:00Z"),
      ),
    ).toMatchObject({ success: false, errors: { workshop: "Choose a valid workshop." } });
    expect(workshopOptions).toHaveLength(3);
  });

  it("rejects a mobile number shorter than seven characters after normalization", () => {
    expect(
      parseWorkshopBookingInput(
        { ...validInput, mobile: "1 2-3" },
        new Date("2026-07-12T08:00:00Z"),
      ),
    ).toMatchObject({ success: false, errors: { mobile: expect.any(String) } });
  });
});

describe("parseWorkshopBookingStatus", () => {
  it("accepts only supported statuses", () => {
    expect(parseWorkshopBookingStatus("confirmed")).toEqual({ success: true, data: "confirmed" });
    expect(parseWorkshopBookingStatus("refunded")).toEqual({ success: false });
  });
});

describe("parseWorkshopBookingAdminUpdate", () => {
  it("normalizes editable values while accepting an historic booking date", () => {
    expect(
      parseWorkshopBookingAdminUpdate({
        workshopId: "mini-course",
        fullName: "  Noor Khalil ",
        mobile: " +970 59 123 4567 ",
        email: " noor@example.com ",
        date: "2026-07-01",
        participants: 4,
      }),
    ).toEqual({
      success: true,
      data: {
        workshopId: "mini-course",
        fullName: "Noor Khalil",
        mobile: "+970591234567",
        email: "noor@example.com",
        date: "2026-07-01",
        participants: 4,
      },
    });
  });

  it("accepts an unset supervisor date for a supervisor-assigned workshop", () => {
    expect(
      parseWorkshopBookingAdminUpdate({ ...validAdminInput, workshopId: "mini-course", date: null }),
    ).toMatchObject({ success: true, data: { workshopId: "mini-course", date: null } });
  });

  it("requires a supervisor date for the corset workshop", () => {
    expect(
      parseWorkshopBookingAdminUpdate({ ...validAdminInput, workshopId: "corset-workshop", date: null }),
    ).toMatchObject({ success: false, errors: { date: "Choose a workshop date." } });
  });
});

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
    const emptyEmail = parseWorkshopBooking(workshop, validValues, new Date(2026, 6, 9, 12));
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
        workshopId: "corset-workshop",
        workshopName: workshop.name,
        fullName: "Noor Al-Hashemi",
        mobile: "0501234567",
        date: "2026-07-10",
        participants: 2,
        notes: "First workshop booking",
      },
    });
  });

  it("requires a workshop, full name, and mobile", () => {
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
      },
    });
  });
});
