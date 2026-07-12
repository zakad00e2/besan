import { parseWorkshopBookingInput } from "./workshop-booking";
import type { WorkshopBookingRepository } from "./workshop-booking-repository.server";

export type WorkshopBookingSubmissionResult =
  | { success: true; bookingId: string }
  | { success: false; reason: "validation"; fieldErrors: Record<string, string | undefined> }
  | { success: false; reason: "storage-error" };

export async function submitWorkshopBookingRequest(
  input: unknown,
  repository: Pick<WorkshopBookingRepository, "create">,
): Promise<WorkshopBookingSubmissionResult> {
  const parsed = parseWorkshopBookingInput(input);
  if (!parsed.success) {
    return { success: false, reason: "validation", fieldErrors: { ...parsed.errors } };
  }

  try {
    const booking = await repository.create(parsed.data);
    return { success: true, bookingId: booking.id };
  } catch (error) {
    console.error(error);
    return { success: false, reason: "storage-error" };
  }
}
