import { z } from "zod";

export const appointmentTypes = ["Custom Design", "Consultation", "Dresses for Rent"] as const;

export const nextAppointmentTypes = [
  "Initial Consultation",
  "First Fitting",
  "Second Fitting",
  "Final Fitting & Pickup",
] as const;

const legacyNextAppointmentTypes = [
  "New Design",
  "Measurements",
  "Alteration",
  "Pickup",
] as const;

export type PublicAppointmentType = (typeof appointmentTypes)[number];
export type NextAppointmentType = (typeof nextAppointmentTypes)[number];
type LegacyNextAppointmentType = (typeof legacyNextAppointmentTypes)[number];
export type AppointmentType =
  | PublicAppointmentType
  | NextAppointmentType
  | LegacyNextAppointmentType;
const adminAppointmentTypes = [
  ...appointmentTypes,
  ...nextAppointmentTypes,
  ...legacyNextAppointmentTypes,
] as const;

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

const nextAppointmentStage: Record<NextAppointmentType, CustomerStage> = {
  "Initial Consultation": "initial-appointment",
  "First Fitting": "fitting",
  "Second Fitting": "fitting",
  "Final Fitting & Pickup": "ready-delivery",
};

export function getStageForNextAppointment(appointmentType: NextAppointmentType): CustomerStage {
  return nextAppointmentStage[appointmentType];
}

export const bookingStatuses = ["pending", "confirmed", "completed", "cancelled"] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

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
  customerCreatedAt: string;
  customerUpdatedAt: string;
  appointmentType: AppointmentType;
  status: BookingStatus;
  reminderStatus: BookingReminderStatus;
  createdAt: string;
};

export function parseBookingStatus(
  status: unknown,
): { success: true; data: BookingStatus } | { success: false } {
  return typeof status === "string" && bookingStatuses.includes(status as BookingStatus)
    ? { success: true, data: status as BookingStatus }
    : { success: false };
}

export type BookingParseResult =
  | { success: true; data: ValidatedBooking }
  | { success: false; fieldErrors: Partial<Record<keyof BookingInput, string>> };

export type AdminBookingInput = {
  customerId: string;
  appointmentType: AppointmentType;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  status: BookingStatus;
  reminderStatus: BookingReminderStatus;
};

export type ValidatedAdminBooking = AdminBookingInput;

export type AdminBookingCreateInput = Omit<AdminBookingInput, "customerId"> & {
  fullName: string;
  mobile: string;
};

export type ValidatedAdminBookingCreate = AdminBookingCreateInput;

export type AdminBookingParseResult =
  | { success: true; data: ValidatedAdminBooking }
  | { success: false; fieldErrors: Partial<Record<keyof AdminBookingInput, string>> };

export type AdminBookingCreateParseResult =
  | { success: true; data: ValidatedAdminBookingCreate }
  | { success: false; fieldErrors: Partial<Record<keyof AdminBookingCreateInput, string>> };

export type ScheduleNextAppointmentInput = {
  currentAppointmentId: string;
  appointmentType: NextAppointmentType;
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

const adminBookingSchema = z.object({
  customerId: z.string().uuid("Choose a valid customer."),
  appointmentType: z.enum(adminAppointmentTypes, { message: "Choose an appointment type." }),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an available date."),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose an available time."),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer."),
  status: z.enum(bookingStatuses, { message: "Choose a booking status." }),
  reminderStatus: z.enum(reminderStatuses, { message: "Choose a reminder status." }),
});

const adminBookingCreateSchema = adminBookingSchema.omit({ customerId: true }).extend({
  fullName: z.string().trim().min(1, "Enter the customer name."),
  mobile: z.string().trim().min(1, "Enter the customer phone number."),
});

export function parseAdminBookingInput(input: unknown): AdminBookingParseResult {
  const parsed = adminBookingSchema.safeParse(input);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(fields).map(([key, messages]) => [key, messages?.[0]]),
      ) as Partial<Record<keyof AdminBookingInput, string>>,
    };
  }

  return { success: true, data: { ...parsed.data, notes: parsed.data.notes.trim() } };
}

export function parseAdminBookingCreateInput(input: unknown): AdminBookingCreateParseResult {
  const parsed = adminBookingCreateSchema.safeParse(input);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(fields).map(([key, messages]) => [key, messages?.[0]]),
      ) as Partial<Record<keyof AdminBookingCreateInput, string>>,
    };
  }

  return { success: true, data: { ...parsed.data, notes: parsed.data.notes.trim() } };
}

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
