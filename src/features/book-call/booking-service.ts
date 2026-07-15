import type { AvailabilityRepository } from "@/features/availability/availability-repository.server";
import { getSlotsForDate } from "@/features/availability/availability-service";
import type { BookingInput } from "./booking-domain";
import { parseBookingInput } from "./booking-domain";
import type { BookingRepository } from "./booking-repository.server";

export type BookingSubmissionResult =
  | { success: true; appointmentId: string }
  | { success: false; reason: "validation"; fieldErrors: Record<string, string | undefined> }
  | { success: false; reason: "slot-unavailable" | "storage-error" };

export async function submitBookingRequest(
  input: BookingInput,
  bookingRepository: Pick<BookingRepository, "create">,
  availabilityRepository: AvailabilityRepository,
  now = new Date(),
): Promise<BookingSubmissionResult> {
  const parsed = parseBookingInput(input);
  if (!parsed.success) {
    return { success: false, reason: "validation", fieldErrors: parsed.fieldErrors };
  }

  const availability = await getSlotsForDate(
    parsed.data.appointmentDate,
    availabilityRepository,
    now,
  );
  if (!availability.success) return { success: false, reason: "storage-error" };
  if (!availability.slots.some((slot) => slot.startsAt === parsed.data.appointmentTime)) {
    return { success: false, reason: "slot-unavailable" };
  }

  try {
    return await bookingRepository.create(parsed.data);
  } catch (error) {
    console.error(error);
    return { success: false, reason: "storage-error" };
  }
}
