import { z } from "zod";

export const appointmentTypes = [
  "New Design",
  "First Fitting",
  "Second Fitting",
  "Alteration",
  "Pickup",
] as const;

export const timesByDay = {
  Monday: ["10:00", "12:30", "16:00"],
  Tuesday: ["11:00", "14:00", "17:30"],
  Wednesday: ["10:30", "13:00", "16:30"],
  Thursday: ["12:00", "15:00", "18:00"],
  Saturday: ["10:00", "12:00", "14:30"],
} as const;

type AppointmentDay = keyof typeof timesByDay;

export type BookingInput = {
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  fullName: string;
  mobile: string;
  notes: string;
};

export type ValidatedBooking = Omit<BookingInput, "appointmentType"> & {
  appointmentType: (typeof appointmentTypes)[number];
};

export type BookingListItem = ValidatedBooking & {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  reminderStatus: "not-scheduled" | "scheduled" | "sent";
  createdAt: string;
};

export type BookingParseResult =
  | { success: true; data: ValidatedBooking }
  | { success: false; fieldErrors: Partial<Record<keyof BookingInput, string>> };

const inputSchema = z.object({
  appointmentType: z.string(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/),
  fullName: z.string(),
  mobile: z.string(),
  notes: z.string(),
});

function getAppointmentDay(date: string): AppointmentDay | undefined {
  const day = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
  return day in timesByDay ? (day as AppointmentDay) : undefined;
}

function normalizeMobile(mobile: string) {
  const trimmed = mobile.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export function formatBookingDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseBookingInput(input: BookingInput): BookingParseResult {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, fieldErrors: { appointmentDate: "Choose a valid appointment date." } };
  }

  const data = {
    appointmentType: parsed.data.appointmentType,
    appointmentDate: parsed.data.appointmentDate,
    appointmentTime: parsed.data.appointmentTime,
    fullName: parsed.data.fullName.trim(),
    mobile: normalizeMobile(parsed.data.mobile),
    notes: parsed.data.notes.trim(),
  };
  const fieldErrors: Partial<Record<keyof BookingInput, string>> = {};

  if (!appointmentTypes.includes(data.appointmentType as (typeof appointmentTypes)[number])) {
    fieldErrors.appointmentType = "Choose an appointment type.";
  }
  if (data.fullName.length < 2 || data.fullName.length > 120) {
    fieldErrors.fullName = "Enter your full name.";
  }
  if (data.mobile.length < 7 || data.mobile.length > 20) {
    fieldErrors.mobile = "Enter a valid mobile number.";
  }
  if (data.notes.length > 1000) {
    fieldErrors.notes = "Notes must be 1000 characters or fewer.";
  }

  const day = getAppointmentDay(data.appointmentDate);
  if (!day) {
    fieldErrors.appointmentDate = "Choose an available appointment day.";
  } else if (!timesByDay[day].includes(data.appointmentTime as never)) {
    fieldErrors.appointmentTime = "Choose an available appointment time.";
  }

  if (Object.keys(fieldErrors).length) return { success: false, fieldErrors };

  return {
    success: true,
    data: data as ValidatedBooking,
  };
}
