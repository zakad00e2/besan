export const customerStages = [
  "new-inquiry",
  "initial-appointment",
  "measurements-taken",
  "design-production",
  "fitting",
  "ready-delivery",
  "completed",
] as const;

export type CustomerStage = (typeof customerStages)[number];
export type BookingType = "workshop" | "design";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type ReminderStatus = "not-scheduled" | "scheduled" | "sent";
export type WorkingDay = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday";

export type CustomerNote = { id: string; body: string; createdAt: string };
export type CustomerActivity = { id: string; label: string; createdAt: string };

export type Customer = {
  id: string;
  name: string;
  phone: string;
  stage: CustomerStage;
  updatedAt: string;
  notes: CustomerNote[];
  activity: CustomerActivity[];
};

export type Appointment = {
  id: string;
  customerId: string;
  type: BookingType;
  purpose: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reminderStatus: ReminderStatus;
};

export type AvailabilitySlot = {
  id: string;
  day: WorkingDay;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
};

export type ReminderSettings = {
  customerWhatsapp: boolean;
  supervisorDashboard: boolean;
  hoursBefore: 24;
};

export type DashboardState = {
  customers: Customer[];
  appointments: Appointment[];
  availability: AvailabilitySlot[];
  reminderSettings: ReminderSettings;
};

export type DashboardMetrics = {
  today: number;
  thisWeek: number;
  newCustomers: number;
  needsFollowUp: number;
};

export const stageLabels: Record<CustomerStage, string> = {
  "new-inquiry": "استفسار جديد",
  "initial-appointment": "موعد أولي",
  "measurements-taken": "تم أخذ القياسات",
  "design-production": "قيد التصميم والتنفيذ",
  fitting: "بروفة",
  "ready-delivery": "جاهز للتسليم",
  completed: "مكتمل",
};

export const bookingTypeLabels: Record<BookingType, string> = {
  workshop: "ورشة",
  design: "تصميم",
};

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
  completed: "مكتمل",
  cancelled: "ملغى",
};

export const reminderStatusLabels: Record<ReminderStatus, string> = {
  "not-scheduled": "غير مجدول",
  scheduled: "مجدول",
  sent: "تم الإرسال",
};

export const workingDayLabels: Record<WorkingDay, string> = {
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
};

export function createAvailabilitySlots(): AvailabilitySlot[] {
  const days = Object.keys(workingDayLabels) as WorkingDay[];

  return days.flatMap((day) =>
    Array.from({ length: 8 }, (_, index) => {
      const hour = index + 10;
      return {
        id: `${day}-${hour}`,
        day,
        startsAt: `${String(hour).padStart(2, "0")}:00`,
        endsAt: `${String(hour + 1).padStart(2, "0")}:00`,
        enabled: index < 6,
      };
    }),
  );
}

export function appointmentsOverlap(
  appointment: Pick<Appointment, "startsAt" | "endsAt">,
  startsAt: string,
  endsAt: string,
) {
  return (
    new Date(startsAt) < new Date(appointment.endsAt) &&
    new Date(endsAt) > new Date(appointment.startsAt)
  );
}

export function getDashboardMetrics(
  customers: Customer[],
  appointments: Appointment[],
  now = new Date(),
): DashboardMetrics {
  const dayKey = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  return {
    today: appointments.filter((item) => item.startsAt.slice(0, 10) === dayKey).length,
    thisWeek: appointments.filter((item) => {
      const date = new Date(item.startsAt);
      return date >= now && date < weekEnd;
    }).length,
    newCustomers: customers.filter((item) => item.stage === "new-inquiry").length,
    needsFollowUp: customers.filter((item) => {
      const inactiveForThreeDays =
        now.getTime() - new Date(item.updatedAt).getTime() >= 3 * 24 * 60 * 60 * 1000;
      return inactiveForThreeDays && !["ready-delivery", "completed"].includes(item.stage);
    }).length,
  };
}
