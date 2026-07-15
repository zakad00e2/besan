import { z } from "zod";

export const workshopOptions = [
  { id: "pattern-foundation", name: "Pattern foundation" },
  { id: "mini-course", name: "Private mini course" },
  { id: "corset-workshop", name: "One-day corset workshop" },
] as const;

export const workshopBookingStatuses = ["pending", "confirmed", "completed", "cancelled"] as const;

export type WorkshopBookingStatus = (typeof workshopBookingStatuses)[number];

export type WorkshopOption = {
  id: string;
  name: string;
};

export type WorkshopBookingFormValues = {
  fullName: string;
  mobile: string;
  email: string;
  date: string;
  participants: string;
  notes: string;
};

export type WorkshopBookingInput = {
  workshopId: string;
  workshopName: string;
  fullName: string;
  mobile: string;
  email?: string;
  date: string;
  participants: number;
  notes?: string;
};

export type WorkshopBookingAdminUpdateInput = {
  fullName: string;
  mobile: string;
  email: string;
  date: string;
  participants: number;
};

export type ValidatedWorkshopBooking = WorkshopBookingInput & { email: string; notes: string };

export type WorkshopBookingListItem = ValidatedWorkshopBooking & {
  id: string;
  status: WorkshopBookingStatus;
  createdAt: string;
  updatedAt: string;
};

export type WorkshopBookingRequest = WorkshopBookingInput;

type BookingField = keyof WorkshopBookingFormValues | "workshop";
export type WorkshopBookingErrors = Partial<Record<BookingField, string>>;

export type WorkshopBookingResult =
  | { success: true; data: WorkshopBookingRequest }
  | { success: false; errors: WorkshopBookingErrors };

export type ValidatedWorkshopBookingResult =
  | { success: true; data: ValidatedWorkshopBooking }
  | { success: false; errors: WorkshopBookingErrors };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const workshopBookingInputSchema = z.object({
  workshopId: z.string(),
  workshopName: z.string(),
  fullName: z.string(),
  mobile: z.string(),
  email: z.string().optional(),
  date: z.string(),
  participants: z.number(),
  notes: z.string().optional(),
});

const workshopBookingStatusSchema = z.enum(workshopBookingStatuses);

const workshopBookingAdminUpdateSchema = z.object({
  fullName: z.string(),
  mobile: z.string(),
  email: z.string(),
  date: z.string(),
  participants: z.number(),
});

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isCalendarDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;

  const [, year, month, day] = match;
  const candidate = new Date(Number(year), Number(month) - 1, Number(day));
  return formatLocalDate(candidate) === date;
}

function normalizeMobile(mobile: string) {
  return mobile.replace(/[\s().-]/g, "");
}

function inputTypeErrors(input: unknown): WorkshopBookingErrors {
  const parsed = workshopBookingInputSchema.safeParse(input);
  if (parsed.success) return {};

  const errors: WorkshopBookingErrors = {};
  for (const issue of parsed.error.issues) {
    switch (issue.path[0]) {
      case "workshopId":
      case "workshopName":
        errors.workshop = "Choose a valid workshop.";
        break;
      case "fullName":
        errors.fullName = "Enter your full name.";
        break;
      case "mobile":
        errors.mobile = "Enter your mobile number.";
        break;
      case "email":
        errors.email = "Enter a valid email address.";
        break;
      case "date":
        errors.date = "Choose a workshop date.";
        break;
      case "participants":
        errors.participants = "Enter a whole number of at least 1.";
        break;
      case "notes":
        errors.notes = "Enter valid booking notes.";
        break;
    }
  }
  return errors;
}

export function getTomorrowDateMinimum(today = new Date()) {
  const tomorrow = new Date(today);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatLocalDate(tomorrow);
}

export function parseWorkshopBookingInput(
  input: unknown,
  today = new Date(),
): ValidatedWorkshopBookingResult {
  const parsed = workshopBookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: inputTypeErrors(input) };
  }

  const workshopId = parsed.data.workshopId.trim();
  const workshopName = parsed.data.workshopName.trim();
  const fullName = parsed.data.fullName.trim();
  const mobile = normalizeMobile(parsed.data.mobile.trim());
  const email = (parsed.data.email ?? "").trim();
  const date = parsed.data.date.trim();
  const notes = (parsed.data.notes ?? "").trim();
  const { participants } = parsed.data;
  const errors: WorkshopBookingErrors = {};

  if (!workshopOptions.some((option) => option.id === workshopId && option.name === workshopName)) {
    errors.workshop = "Choose a valid workshop.";
  }
  if (fullName.length < 2) {
    errors.fullName = "Enter your full name.";
  } else if (fullName.length > 120) {
    errors.fullName = "Enter a full name of 120 characters or fewer.";
  }
  if (!mobile) {
    errors.mobile = "Enter your mobile number.";
  } else if (mobile.length < 7) {
    errors.mobile = "Enter a mobile number of at least 7 characters.";
  } else if (mobile.length > 20) {
    errors.mobile = "Enter a mobile number of 20 characters or fewer.";
  }
  if (email && (!emailPattern.test(email) || email.length > 254)) {
    errors.email = "Enter a valid email address.";
  }
  if (!date || !isCalendarDate(date)) {
    errors.date = "Choose a workshop date.";
  } else if (date < getTomorrowDateMinimum(today)) {
    errors.date = "Choose a date after today.";
  }
  if (!Number.isInteger(participants) || participants < 1) {
    errors.participants = "Enter a whole number of at least 1.";
  }
  if (notes.length > 1000) {
    errors.notes = "Enter booking notes of 1000 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: { workshopId, workshopName, fullName, mobile, email, date, participants, notes },
  };
}

export function parseWorkshopBookingStatus(
  input: unknown,
): { success: true; data: WorkshopBookingStatus } | { success: false } {
  const parsed = workshopBookingStatusSchema.safeParse(input);
  return parsed.success ? { success: true, data: parsed.data } : { success: false };
}

export function parseWorkshopBookingAdminUpdate(
  input: unknown,
):
  | { success: true; data: WorkshopBookingAdminUpdateInput }
  | {
      success: false;
      errors: Pick<
        WorkshopBookingErrors,
        "fullName" | "mobile" | "email" | "date" | "participants"
      >;
    } {
  const parsed = workshopBookingAdminUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: inputTypeErrors(input) };
  }

  const fullName = parsed.data.fullName.trim();
  const mobile = normalizeMobile(parsed.data.mobile.trim());
  const email = parsed.data.email.trim();
  const date = parsed.data.date.trim();
  const { participants } = parsed.data;
  const errors: Pick<
    WorkshopBookingErrors,
    "fullName" | "mobile" | "email" | "date" | "participants"
  > = {};

  if (fullName.length < 2) {
    errors.fullName = "Enter your full name.";
  } else if (fullName.length > 120) {
    errors.fullName = "Enter a full name of 120 characters or fewer.";
  }
  if (!mobile) {
    errors.mobile = "Enter your mobile number.";
  } else if (mobile.length < 7) {
    errors.mobile = "Enter a mobile number of at least 7 characters.";
  } else if (mobile.length > 20) {
    errors.mobile = "Enter a mobile number of 20 characters or fewer.";
  }
  if (email && (!emailPattern.test(email) || email.length > 254)) {
    errors.email = "Enter a valid email address.";
  }
  if (!date || !isCalendarDate(date)) {
    errors.date = "Choose a workshop date.";
  }
  if (!Number.isInteger(participants) || participants < 1) {
    errors.participants = "Enter a whole number of at least 1.";
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  return { success: true, data: { fullName, mobile, email, date, participants } };
}

export function parseWorkshopBooking(
  workshop: WorkshopOption | null,
  values: WorkshopBookingFormValues,
  today = new Date(),
): WorkshopBookingResult {
  const result = parseWorkshopBookingInput(
    {
      workshopId: workshop?.id ?? "",
      workshopName: workshop?.name ?? "",
      fullName: values.fullName,
      mobile: values.mobile,
      email: values.email,
      date: values.date,
      participants: Number(values.participants),
      notes: values.notes,
    },
    today,
  );

  if (!result.success) {
    return {
      success: false,
      errors: {
        ...result.errors,
        ...(workshop ? {} : { workshop: "Choose a workshop." }),
      },
    };
  }

  const { email, notes, ...requiredData } = result.data;
  return {
    success: true,
    data: {
      ...requiredData,
      ...(email ? { email } : {}),
      ...(notes ? { notes } : {}),
    },
  };
}
