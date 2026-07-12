import { createServerFn } from "@tanstack/react-start";
import type { WorkshopBookingInput } from "./workshop-booking";
import { getNeonWorkshopBookingRepository } from "./workshop-booking-repository.server";
import { submitWorkshopBookingRequest } from "./workshop-booking-service";

export const submitWorkshopBooking = createServerFn({ method: "POST" })
  .validator((data: WorkshopBookingInput) => data)
  .handler(({ data }) => submitWorkshopBookingRequest(data, getNeonWorkshopBookingRepository()));
