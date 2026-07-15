import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  parseBookingStatus,
  parseScheduleNextAppointmentInput,
  type BookingListItem,
} from "@/features/book-call/booking-domain";
import {
  getNeonBookingRepository,
  type BookingRepository,
} from "@/features/book-call/booking-repository.server";
import {
  parseWorkshopBookingAdminUpdate,
  parseWorkshopBookingStatus,
  type WorkshopBookingErrors,
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
  .handler(async ({ data }) => await listBookingsForAdmin(data.token));

type BookingAdminDependencies = {
  verifyAdminToken: typeof verifyAdminToken;
} & (
  | {
      repository: Pick<
        BookingRepository,
        "list" | "updateStatus" | "updateReminderStatus" | "delete" | "scheduleNextAppointment"
      >;
    }
  | {
      repository?: never;
      getRepository: () => Pick<
        BookingRepository,
        "list" | "updateStatus" | "updateReminderStatus" | "delete" | "scheduleNextAppointment"
      >;
    }
);

const defaultBookingAdminDependencies: BookingAdminDependencies = {
  verifyAdminToken,
  getRepository: getNeonBookingRepository,
};

function resolveBookingRepository(dependencies: BookingAdminDependencies) {
  if (dependencies.repository) return dependencies.repository;
  return dependencies.getRepository();
}

export async function listBookingsForAdmin(
  token: string,
  dependencies: BookingAdminDependencies = defaultBookingAdminDependencies,
): Promise<
  | { success: true; bookings: BookingListItem[] }
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
    return { success: true, bookings: await resolveBookingRepository(dependencies).list() };
  } catch (error) {
    console.error("Failed to load design bookings.", error);
    return { success: false, reason: "load-error" };
  }
}

export async function changeBookingStatusForAdmin(
  input: { token: string; id: string; status: unknown },
  dependencies: BookingAdminDependencies = defaultBookingAdminDependencies,
): Promise<
  | { success: true; booking: BookingListItem }
  | { success: false; reason: "forbidden" | "invalid-status" | "not-found" | "update-error" }
> {
  let access: Awaited<ReturnType<typeof verifyAdminToken>>;
  try {
    access = await dependencies.verifyAdminToken(input.token);
  } catch {
    return { success: false, reason: "forbidden" };
  }
  if (!access.allowed) return { success: false, reason: "forbidden" };

  const status = parseBookingStatus(input.status);
  if (!status.success) return { success: false, reason: "invalid-status" };

  try {
    return await resolveBookingRepository(dependencies).updateStatus(input.id, status.data);
  } catch {
    return { success: false, reason: "update-error" };
  }
}

export const updateBookingStatus = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), id: z.string().uuid(), status: z.unknown() }))
  .handler(({ data }) => changeBookingStatusForAdmin(data));

export async function markBookingReminderSentForAdmin(
  input: { token: string; id: string },
  dependencies: BookingAdminDependencies = defaultBookingAdminDependencies,
): Promise<
  { success: true } | { success: false; reason: "forbidden" | "not-found" | "update-error" }
> {
  let access: Awaited<ReturnType<typeof verifyAdminToken>>;
  try {
    access = await dependencies.verifyAdminToken(input.token);
  } catch {
    return { success: false, reason: "forbidden" };
  }
  if (!access.allowed) return { success: false, reason: "forbidden" };

  try {
    return await resolveBookingRepository(dependencies).updateReminderStatus(input.id, "sent");
  } catch {
    return { success: false, reason: "update-error" };
  }
}

export const markBookingReminderSent = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), id: z.string().uuid() }))
  .handler(({ data }) => markBookingReminderSentForAdmin(data));

export async function deleteBookingForAdmin(
  input: { token: string; id: string },
  dependencies: BookingAdminDependencies = defaultBookingAdminDependencies,
): Promise<
  { success: true } | { success: false; reason: "forbidden" | "not-found" | "delete-error" }
> {
  let access: Awaited<ReturnType<typeof verifyAdminToken>>;
  try {
    access = await dependencies.verifyAdminToken(input.token);
  } catch {
    return { success: false, reason: "forbidden" };
  }
  if (!access.allowed) return { success: false, reason: "forbidden" };

  try {
    return await resolveBookingRepository(dependencies).delete(input.id);
  } catch {
    return { success: false, reason: "delete-error" };
  }
}

export const deleteBooking = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), id: z.string().uuid() }))
  .handler(({ data }) => deleteBookingForAdmin(data));

export async function scheduleNextAppointmentForAdmin(
  input: { token: string; input: unknown },
  dependencies: BookingAdminDependencies = defaultBookingAdminDependencies,
): Promise<
  | { success: true; currentBooking: BookingListItem; nextBooking: BookingListItem }
  | {
      success: false;
      reason:
        | "forbidden"
        | "validation"
        | "not-found"
        | "cancelled"
        | "slot-unavailable"
        | "storage-error";
      fieldErrors?: Record<string, string | undefined>;
    }
> {
  let access: Awaited<ReturnType<typeof verifyAdminToken>>;
  try {
    access = await dependencies.verifyAdminToken(input.token);
  } catch {
    return { success: false, reason: "forbidden" };
  }
  if (!access.allowed) return { success: false, reason: "forbidden" };

  const parsed = parseScheduleNextAppointmentInput(input.input);
  if (!parsed.success) {
    return { success: false, reason: "validation", fieldErrors: parsed.fieldErrors };
  }

  try {
    return await resolveBookingRepository(dependencies).scheduleNextAppointment(parsed.data);
  } catch {
    return { success: false, reason: "storage-error" };
  }
}

export const scheduleNextAppointment = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), input: z.unknown() }))
  .handler(({ data }) => scheduleNextAppointmentForAdmin(data));

type WorkshopBookingAdminDependencies = {
  verifyAdminToken: typeof verifyAdminToken;
} & (
  | { repository: Pick<WorkshopBookingRepository, "list" | "updateStatus" | "update" | "delete"> }
  | {
      repository?: never;
      getRepository: () => Pick<WorkshopBookingRepository, "list" | "updateStatus" | "update" | "delete">;
    }
);

const defaultWorkshopBookingAdminDependencies: WorkshopBookingAdminDependencies = {
  verifyAdminToken,
  getRepository: getNeonWorkshopBookingRepository,
};

function resolveWorkshopBookingRepository(dependencies: WorkshopBookingAdminDependencies) {
  if (dependencies.repository) return dependencies.repository;
  return dependencies.getRepository();
}

export async function listWorkshopBookingsForAdmin(
  token: string,
  dependencies: WorkshopBookingAdminDependencies = defaultWorkshopBookingAdminDependencies,
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
    return { success: true, bookings: await resolveWorkshopBookingRepository(dependencies).list() };
  } catch {
    return { success: false, reason: "load-error" };
  }
}

export async function changeWorkshopBookingStatusForAdmin(
  input: { token: string; id: string; status: unknown },
  dependencies: WorkshopBookingAdminDependencies = defaultWorkshopBookingAdminDependencies,
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
    return await resolveWorkshopBookingRepository(dependencies).updateStatus(input.id, status.data);
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

export async function updateWorkshopBookingForAdmin(
  input: { token: string; id: string; input: unknown },
  dependencies: WorkshopBookingAdminDependencies = defaultWorkshopBookingAdminDependencies,
): Promise<
  | { success: true; booking: WorkshopBookingListItem }
  | {
      success: false;
      reason: "forbidden" | "validation" | "not-found" | "update-error";
      fieldErrors?: WorkshopBookingErrors;
    }
> {
  let access: Awaited<ReturnType<typeof verifyAdminToken>>;
  try {
    access = await dependencies.verifyAdminToken(input.token);
  } catch {
    return { success: false, reason: "forbidden" };
  }
  if (!access.allowed) return { success: false, reason: "forbidden" };

  const parsed = parseWorkshopBookingAdminUpdate(input.input);
  if (!parsed.success) {
    return { success: false, reason: "validation", fieldErrors: parsed.errors };
  }

  try {
    return await resolveWorkshopBookingRepository(dependencies).update(input.id, parsed.data);
  } catch {
    return { success: false, reason: "update-error" };
  }
}

export const updateWorkshopBooking = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), id: z.string().uuid(), input: z.unknown() }))
  .handler(({ data }) => updateWorkshopBookingForAdmin(data));

export async function deleteWorkshopBookingForAdmin(
  input: { token: string; id: string },
  dependencies: WorkshopBookingAdminDependencies = defaultWorkshopBookingAdminDependencies,
): Promise<{ success: true } | { success: false; reason: "forbidden" | "not-found" | "delete-error" }> {
  let access: Awaited<ReturnType<typeof verifyAdminToken>>;
  try {
    access = await dependencies.verifyAdminToken(input.token);
  } catch {
    return { success: false, reason: "forbidden" };
  }
  if (!access.allowed) return { success: false, reason: "forbidden" };

  try {
    return await resolveWorkshopBookingRepository(dependencies).delete(input.id);
  } catch {
    return { success: false, reason: "delete-error" };
  }
}

export const deleteWorkshopBooking = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), id: z.string().uuid() }))
  .handler(({ data }) => deleteWorkshopBookingForAdmin(data));
