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
    updatedAt: booking.customerUpdatedAt,
    notes: [],
    activity: [],
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
    appointments: [...data.appointments.map((item) => (item.id === current.id ? current : item)), next],
  };
}
