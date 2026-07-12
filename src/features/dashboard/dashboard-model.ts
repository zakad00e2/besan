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

export type BookingStatusDistribution = Record<AppointmentStatus, number>;

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

export type MetricComparison = {
  current: number;
  previous: number;
  changePercent: number | null;
};

export type DashboardMetricComparisons = {
  totalBookings: MetricComparison;
  todayAppointments: MetricComparison;
  newCustomers: MetricComparison;
  needsFollowUp: MetricComparison;
};

export function calculateChangePercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

export function getBookingStatusDistribution(
  appointments: Appointment[],
): BookingStatusDistribution {
  return appointments.reduce<BookingStatusDistribution>(
    (distribution, appointment) => {
      distribution[appointment.status] += 1;
      return distribution;
    },
    { confirmed: 0, pending: 0, completed: 0, cancelled: 0 },
  );
}

function isWithinRange(dateString: string, start: Date, end: Date) {
  const time = new Date(dateString).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function getCustomerCreatedAt(customer: Customer) {
  return customer.activity[0]?.createdAt ?? customer.updatedAt;
}

function countNeedsFollowUpAt(customers: Customer[], asOf: Date) {
  return customers.filter((customer) => {
    const inactiveForThreeDays =
      asOf.getTime() - new Date(customer.updatedAt).getTime() >= 3 * 24 * 60 * 60 * 1000;
    return inactiveForThreeDays && !["ready-delivery", "completed"].includes(customer.stage);
  }).length;
}

export const stageLabels: Record<CustomerStage, string> = {
  "new-inquiry": "New inquiry",
  "initial-appointment": "Initial appointment",
  "measurements-taken": "Measurements taken",
  "design-production": "Design and production",
  fitting: "Fitting",
  "ready-delivery": "Ready for delivery",
  completed: "Completed",
};

export const bookingTypeLabels: Record<BookingType, string> = {
  workshop: "Workshop",
  design: "Design",
};

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const reminderStatusLabels: Record<ReminderStatus, string> = {
  "not-scheduled": "Not scheduled",
  scheduled: "Scheduled",
  sent: "Sent",
};

export const workingDayLabels: Record<WorkingDay, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
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

export function getDashboardMetricComparisons(
  customers: Customer[],
  appointments: Appointment[],
  now = new Date(),
): DashboardMetricComparisons {
  const dayKey = now.toISOString().slice(0, 10);
  const endOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const previousMonthSameDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate(), 23, 59, 59, 999),
  );
  const sameDayLastMonthKey = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);

  const currentMonthBookings = appointments.filter((appointment) =>
    isWithinRange(appointment.startsAt, currentMonthStart, endOfToday),
  ).length;
  const previousMonthBookings = appointments.filter((appointment) =>
    isWithinRange(appointment.startsAt, previousMonthStart, previousMonthSameDay),
  ).length;

  const todayAppointments = appointments.filter(
    (appointment) => appointment.startsAt.slice(0, 10) === dayKey,
  ).length;
  const sameDayLastMonthAppointments = appointments.filter(
    (appointment) => appointment.startsAt.slice(0, 10) === sameDayLastMonthKey,
  ).length;

  const currentMonthNewCustomers = customers.filter((customer) =>
    isWithinRange(getCustomerCreatedAt(customer), currentMonthStart, endOfToday),
  ).length;
  const previousMonthNewCustomers = customers.filter((customer) =>
    isWithinRange(getCustomerCreatedAt(customer), previousMonthStart, previousMonthSameDay),
  ).length;

  const currentFollowUp = countNeedsFollowUpAt(customers, now);
  const previousFollowUp = countNeedsFollowUpAt(customers, previousMonthSameDay);

  return {
    totalBookings: {
      current: currentMonthBookings,
      previous: previousMonthBookings,
      changePercent: calculateChangePercent(currentMonthBookings, previousMonthBookings),
    },
    todayAppointments: {
      current: todayAppointments,
      previous: sameDayLastMonthAppointments,
      changePercent: calculateChangePercent(todayAppointments, sameDayLastMonthAppointments),
    },
    newCustomers: {
      current: currentMonthNewCustomers,
      previous: previousMonthNewCustomers,
      changePercent: calculateChangePercent(currentMonthNewCustomers, previousMonthNewCustomers),
    },
    needsFollowUp: {
      current: currentFollowUp,
      previous: previousFollowUp,
      changePercent: calculateChangePercent(currentFollowUp, previousFollowUp),
    },
  };
}
