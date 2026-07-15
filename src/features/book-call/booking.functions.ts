import { createServerFn } from "@tanstack/react-start";
import { getNeonAvailabilityRepository } from "@/features/availability/availability-repository.server";
import type { BookingInput } from "./booking-domain";
import { getNeonBookingRepository } from "./booking-repository.server";
import { submitBookingRequest } from "./booking-service";

export const submitBooking = createServerFn({ method: "POST" })
  .validator((data: BookingInput) => data)
  .handler(({ data }) =>
    submitBookingRequest(data, getNeonBookingRepository(), getNeonAvailabilityRepository()),
  );
