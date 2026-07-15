import { z } from "zod";

export const appointmentTypes = [
  "New Design",
  "First Fitting",
  "Second Fitting",
  "Alteration",
  "Pickup",
] as const;

export const nextAppointmentTypes = [
  "New Design",
  "Measurements",
  "First Fitting",
  "Second Fitting",
  "Alteration",
  "Pickup",
] as const;

export type AppointmentType = (typeof nextAppointmentTypes)[number];

export const customerStages = [
  "new-inquiry",
  "initial-appointment",
  "measurements-appointment",
  "measurements-taken",
  "design-production",
  "fitting",
  "ready-delivery",
  "completed",
] as const;

export type CustomerStage = (typeof customerStages)[number];

const nextAppointmentStage: Record<AppointmentType, CustomerStage> = {
  "New Design": "initial-appointment",
  Measurements: "measurements-appointment",
  "First Fitting": "fitting",
  "Second Fitting": "fitting",
  Alteration: "fitting",
  Pickup: "ready-delivery",
};

export function getStageForNextAppointment(appointmentType: AppointmentType): CustomerStage {
  return nextAppointmentStage[appointmentType];
}

export const reminderStatuses = ["not-scheduled", "scheduled", "sent"] as const;

export type BookingReminderStatus = (typeof reminderStatuses)[number];

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

export type BookingListItem = Omit<ValidatedBooking, "appointmentType"> & {
  id: string;
  customerId: string;
  customerStage: CustomerStage;
  customerUpdatedAt: string;
  appointmentType: AppointmentType;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  reminderStatus: BookingReminderStatus;
  createdAt: string;
};

export type BookingParseResult =
  | { success: true; data: ValidatedBooking }
  | { success: false; fieldErrors: Partial<Record<keyof BookingInput, string>> };

export type ScheduleNextAppointmentInput = {
  currentAppointmentId: string;
  appointmentType: AppointmentType;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  reminderStatus: BookingReminderStatus;
};

export type ValidatedScheduleNextAppointment = ScheduleNextAppointmentInput;

export type ScheduleNextAppointmentParseResult =
  | { success: true; data: ValidatedScheduleNextAppointment }
  | {
      success: false;
      fieldErrors: Partial<Record<keyof ScheduleNextAppointmentInput, string>>;
    };

const inputSchema = z.object({
  appointmentType: z.string(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/),
  fullName: z.string(),
  mobile: z.string(),
  notes: z.string(),
});

const scheduleNextAppointmentSchema = z.object({
  currentAppointmentId: z.string().uuid("Choose a valid current appointment."),
  appointmentType: z.enum(nextAppointmentTypes, { message: "Choose an appointment type." }),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a valid time."),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer."),
  reminderStatus: z.enum(reminderStatuses, { message: "Choose a reminder status." }),
});

export function parseScheduleNextAppointmentInput(
  input: unknown,
): ScheduleNextAppointmentParseResult {
  const parsed = scheduleNextAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(fields).map(([key, messages]) => [key, messages?.[0]]),
      ),
    };
  }

  return { success: true, data: { ...parsed.data, notes: parsed.data.notes.trim() } };
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

  if (Object.keys(fieldErrors).length) return { success: false, fieldErrors };

  return {
    success: true,
    data: data as ValidatedBooking,
  };
}
