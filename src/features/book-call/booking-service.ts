import type { BookingInput } from "./booking-domain";
import { parseBookingInput } from "./booking-domain";
import type { BookingRepository } from "./booking-repository.server";

export type BookingSubmissionResult =
  | { success: true; appointmentId: string }
  | { success: false; reason: "validation"; fieldErrors: Record<string, string | undefined> }
  | { success: false; reason: "slot-unavailable" | "storage-error" };

export async function submitBookingRequest(
  input: BookingInput,
  repository: Pick<BookingRepository, "create">,
): Promise<BookingSubmissionResult> {
  const parsed = parseBookingInput(input);
  if (!parsed.success) {
    return { success: false, reason: "validation", fieldErrors: parsed.fieldErrors };
  }

  try {
    return await repository.create(parsed.data);
  } catch (error) {
    console.error(error);
    return { success: false, reason: "storage-error" };
  }
}
