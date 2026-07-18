import { nextAppointmentTypes } from "@/features/book-call/booking-domain";
import { stageLabels, type Appointment, type Customer } from "./dashboard-model";

const approvedStages = new Set<string>(nextAppointmentTypes);

export function getCustomerProfileStageLabel({
  customer,
  appointments,
  now = new Date(),
}: {
  customer: Customer;
  appointments: Appointment[];
  now?: Date;
}) {
  const relevant = appointments.filter(
    (appointment) =>
      appointment.customerId === customer.id &&
      appointment.status !== "cancelled" &&
      approvedStages.has(appointment.purpose),
  );

  const upcoming = relevant
    .filter(
      (appointment) => appointment.status !== "completed" && new Date(appointment.startsAt) >= now,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  if (upcoming) return upcoming.purpose;

  const latest = relevant.sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
  return latest?.purpose ?? stageLabels[customer.stage];
}
