import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getNeonBookingRepository } from "@/features/book-call/booking-repository.server";
import { verifyAdminToken } from "./admin-auth.server";

const tokenSchema = z.object({ token: z.string().min(1) });

export const checkAdminAccess = createServerFn({ method: "POST" })
  .validator(tokenSchema)
  .handler(({ data }) => verifyAdminToken(data.token));

export const getBookings = createServerFn({ method: "POST" })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const access = await verifyAdminToken(data.token);
    if (!access.allowed) return { success: false as const, reason: "forbidden" as const };
    try {
      return { success: true as const, bookings: await getNeonBookingRepository().list() };
    } catch (error) {
      console.error(error);
      return { success: false as const, reason: "load-error" as const };
    }
  });
