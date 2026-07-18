import type { BookingListItem } from "@/features/book-call/booking-domain";
import type { Appointment, Customer } from "./dashboard-model";

export type DashboardBookingData = {
  customers: Customer[];
  appointments: Appointment[];
};

function mapCustomer(booking: BookingListItem): Customer {
  return {
    id: booking.customerId,
    name: booking.fullName,
    phone: booking.mobile,
    stage: booking.customerStage,
    createdAt: booking.customerCreatedAt,
    updatedAt: booking.customerUpdatedAt,
  };
}

function mapAppointment(booking: BookingListItem): Appointment {
  const startsAt = `${booking.appointmentDate}T${booking.appointmentTime}:00.000Z`;
  const end = new Date(startsAt);
  end.setUTCHours(end.getUTCHours() + 1);
  return {
    id: booking.id,
    customerId: booking.customerId,
    type: "design",
    purpose: booking.appointmentType,
    notes: booking.notes || undefined,
    startsAt,
    endsAt: end.toISOString(),
    createdAt: booking.createdAt,
    status: booking.status,
    reminderStatus: booking.reminderStatus,
  };
}

export function normalizeBookingList(bookings: BookingListItem[]): DashboardBookingData {
  const customers = new Map<string, Customer>();
  for (const booking of bookings) customers.set(booking.customerId, mapCustomer(booking));
  return {
    customers: [...customers.values()],
    appointments: bookings.map(mapAppointment),
  };
}

export function mergePersistedBooking(
  data: DashboardBookingData,
  booking: BookingListItem,
): DashboardBookingData {
  const normalized = normalizeBookingList([booking]);
  const customer = normalized.customers[0];
  const appointment = normalized.appointments[0];

  return {
    customers: data.customers.some((item) => item.id === customer.id)
      ? data.customers.map((item) => (item.id === customer.id ? customer : item))
      : [...data.customers, customer],
    appointments: data.appointments.some((item) => item.id === appointment.id)
      ? data.appointments.map((item) => (item.id === appointment.id ? appointment : item))
      : [...data.appointments, appointment],
  };
}

export function mergeScheduledNext(
  data: DashboardBookingData,
  currentBooking: BookingListItem,
  nextBooking: BookingListItem,
): DashboardBookingData {
  const customer = mapCustomer(nextBooking);
  const current = mapAppointment(currentBooking);
  const next = mapAppointment(nextBooking);
  return {
    customers: data.customers.map((item) => (item.id === customer.id ? customer : item)),
    appointments: [
      ...data.appointments.map((item) => (item.id === current.id ? current : item)),
      next,
    ],
  };
}
