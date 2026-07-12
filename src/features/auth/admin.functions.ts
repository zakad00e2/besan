import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getNeonBookingRepository } from "@/features/book-call/booking-repository.server";
import {
  parseWorkshopBookingStatus,
  type WorkshopBookingListItem,
} from "@/features/workshop-booking/workshop-booking";
import {
  getNeonWorkshopBookingRepository,
  type WorkshopBookingRepository,
} from "@/features/workshop-booking/workshop-booking-repository.server";
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

type WorkshopBookingAdminDependencies = {
  verifyAdminToken: typeof verifyAdminToken;
  repository: Pick<WorkshopBookingRepository, "list" | "updateStatus">;
};

export async function listWorkshopBookingsForAdmin(
  token: string,
  dependencies: WorkshopBookingAdminDependencies = {
    verifyAdminToken,
    repository: getNeonWorkshopBookingRepository(),
  },
): Promise<
  | { success: true; bookings: WorkshopBookingListItem[] }
  | { success: false; reason: "forbidden" | "load-error" }
> {
  let access: Awaited<ReturnType<typeof verifyAdminToken>>;
  try {
    access = await dependencies.verifyAdminToken(token);
  } catch {
    return { success: false, reason: "forbidden" };
  }
  if (!access.allowed) return { success: false, reason: "forbidden" };

  try {
    return { success: true, bookings: await dependencies.repository.list() };
  } catch {
    return { success: false, reason: "load-error" };
  }
}

export async function changeWorkshopBookingStatusForAdmin(
  input: { token: string; id: string; status: unknown },
  dependencies: WorkshopBookingAdminDependencies = {
    verifyAdminToken,
    repository: getNeonWorkshopBookingRepository(),
  },
): Promise<
  | { success: true; booking: WorkshopBookingListItem }
  | { success: false; reason: "forbidden" | "invalid-status" | "not-found" | "update-error" }
> {
  let access: Awaited<ReturnType<typeof verifyAdminToken>>;
  try {
    access = await dependencies.verifyAdminToken(input.token);
  } catch {
    return { success: false, reason: "forbidden" };
  }
  if (!access.allowed) return { success: false, reason: "forbidden" };

  const status = parseWorkshopBookingStatus(input.status);
  if (!status.success) return { success: false, reason: "invalid-status" };

  try {
    return await dependencies.repository.updateStatus(input.id, status.data);
  } catch {
    return { success: false, reason: "update-error" };
  }
}

export const getWorkshopBookings = createServerFn({ method: "POST" })
  .validator(tokenSchema)
  .handler(({ data }) => listWorkshopBookingsForAdmin(data.token));

export const updateWorkshopBookingStatus = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), id: z.string().uuid(), status: z.unknown() }))
  .handler(({ data }) => changeWorkshopBookingStatusForAdmin(data));
