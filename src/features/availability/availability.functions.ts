import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/start-server-core";
import { z } from "zod";
import { verifyAdminToken } from "@/features/auth/admin-auth.server";
import { getNeonAvailabilityRepository } from "./availability-repository.server";
import {
  deleteOverrideForAdmin,
  getOpenDatesForMonth,
  getSlotsForDate,
  loadAvailabilityForAdmin,
  saveOverrideForAdmin,
  saveWeeklyScheduleForAdmin,
} from "./availability-service";

const repository = () => getNeonAvailabilityRepository();
const adminDependencies = () => ({
  verifyAdminToken,
  getRepository: repository,
  now: () => new Date(),
});

function disablePublicAvailabilityCaching() {
  setResponseHeader("Cache-Control", "no-store");
}

export const getPublicAvailabilityMonth = createServerFn({ method: "GET" })
  .validator(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
  .handler(({ data }) => {
    disablePublicAvailabilityCaching();
    return getOpenDatesForMonth(data.month, repository());
  });

export const getPublicAvailabilityDay = createServerFn({ method: "GET" })
  .validator(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(({ data }) => {
    disablePublicAvailabilityCaching();
    return getSlotsForDate(data.date, repository());
  });

export const getAdminAvailability = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(({ data }) => loadAvailabilityForAdmin(data.token, adminDependencies()));

export const saveAdminWeeklySchedule = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string().min(1), input: z.unknown(), confirmConflicts: z.boolean() }),
  )
  .handler(({ data }) =>
    saveWeeklyScheduleForAdmin(
      data as { token: string; input: unknown; confirmConflicts: boolean },
      adminDependencies(),
    ),
  );

export const saveAdminAvailabilityOverride = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string().min(1), input: z.unknown(), confirmConflicts: z.boolean() }),
  )
  .handler(({ data }) =>
    saveOverrideForAdmin(
      data as { token: string; input: unknown; confirmConflicts: boolean },
      adminDependencies(),
    ),
  );

export const deleteAdminAvailabilityOverride = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string().min(1), id: z.string().uuid(), confirmConflicts: z.boolean() }),
  )
  .handler(({ data }) => deleteOverrideForAdmin(data, adminDependencies()));
