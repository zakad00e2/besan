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

export type WorkshopBookingRequest = {
  workshopId: string;
  workshopName: string;
  fullName: string;
  mobile: string;
  email?: string;
  date: string;
  participants: number;
  notes?: string;
};

type BookingField = keyof WorkshopBookingFormValues | "workshop";
export type WorkshopBookingErrors = Partial<Record<BookingField, string>>;

export type WorkshopBookingResult =
  | { success: true; data: WorkshopBookingRequest }
  | { success: false; errors: WorkshopBookingErrors };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTomorrowDateMinimum(today = new Date()) {
  const tomorrow = new Date(today);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatLocalDate(tomorrow);
}

export function parseWorkshopBooking(
  workshop: WorkshopOption | null,
  values: WorkshopBookingFormValues,
  today = new Date(),
): WorkshopBookingResult {
  const fullName = values.fullName.trim();
  const mobile = values.mobile.trim();
  const email = values.email.trim();
  const notes = values.notes.trim();
  const participants = Number(values.participants);
  const errors: WorkshopBookingErrors = {};

  if (!workshop) errors.workshop = "Choose a workshop.";
  if (!fullName) errors.fullName = "Enter your full name.";
  if (!mobile) errors.mobile = "Enter your mobile number.";
  if (email && !emailPattern.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.date) {
    errors.date = "Choose a workshop date.";
  } else if (values.date < getTomorrowDateMinimum(today)) {
    errors.date = "Choose a date after today.";
  }
  if (!Number.isInteger(participants) || participants < 1) {
    errors.participants = "Enter a whole number of at least 1.";
  }

  if (Object.keys(errors).length > 0 || !workshop) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      workshopId: workshop.id,
      workshopName: workshop.name,
      fullName,
      mobile,
      ...(email ? { email } : {}),
      date: values.date,
      participants,
      ...(notes ? { notes } : {}),
    },
  };
}
