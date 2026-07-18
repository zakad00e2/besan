import { verifyAdminToken } from "@/features/auth/admin-auth.server";
import {
  applyOverride,
  applyWeeklySchedule,
  findScheduleConflicts,
  getLocalDateInTimeZone,
  hasOverrideOverlap,
  listMonthDates,
  parseAvailabilityOverride,
  parseWeeklySchedule,
  removeOverride,
  resolveAvailableSlots,
  type AvailabilityConfiguration,
  type OccupiedAppointment,
} from "./availability-domain";
import type { AvailabilityRepository } from "./availability-repository.server";

export type AvailabilityAdminDependencies = {
  verifyAdminToken: typeof verifyAdminToken;
  now: () => Date;
} & (
  | { repository: AvailabilityRepository; getRepository?: never }
  | { repository?: never; getRepository: () => AvailabilityRepository }
);

export type AvailabilityMutationResult =
  | { success: true; configuration: AvailabilityConfiguration }
  | { success: false; reason: "forbidden" | "storage-error" | "not-found" | "overlap" }
  | { success: false; reason: "validation"; fieldErrors: Record<string, string> }
  | { success: false; reason: "conflicts"; conflicts: OccupiedAppointment[] };

function resolveRepository(dependencies: AvailabilityAdminDependencies): AvailabilityRepository {
  return dependencies.repository ?? dependencies.getRepository();
}

async function isAuthorized(token: string, dependencies: AvailabilityAdminDependencies) {
  try {
    return (await dependencies.verifyAdminToken(token)).allowed;
  } catch {
    return false;
  }
}

async function loadCandidateContext(
  repository: AvailabilityRepository,
  now: Date,
): Promise<{ configuration: AvailabilityConfiguration; appointments: OccupiedAppointment[] }> {
  const configuration = await repository.loadConfiguration();
  const startsOn = getLocalDateInTimeZone(now, configuration.timezone);
  const appointments = await repository.listOccupiedAppointments(startsOn, "9999-12-31");
  return { configuration, appointments };
}

function excludeAppointment(appointments: OccupiedAppointment[], excludeAppointmentId?: string) {
  return excludeAppointmentId
    ? appointments.filter((appointment) => appointment.id !== excludeAppointmentId)
    : appointments;
}

export async function getSlotsForDate(
  date: string,
  repository: AvailabilityRepository,
  now = new Date(),
  excludeAppointmentId?: string,
) {
  try {
    const [configuration, appointments] = await Promise.all([
      repository.loadConfiguration(),
      repository.listOccupiedAppointments(date, date),
    ]);
    return {
      success: true as const,
      slots: resolveAvailableSlots(
        configuration,
        date,
        excludeAppointment(appointments, excludeAppointmentId),
        now,
      ),
    };
  } catch {
    return { success: false as const, reason: "load-error" as const };
  }
}

export async function getOpenDatesForMonth(
  month: string,
  repository: AvailabilityRepository,
  now = new Date(),
  excludeAppointmentId?: string,
) {
  try {
    const dates = listMonthDates(month);
    const [configuration, appointments] = await Promise.all([
      repository.loadConfiguration(),
      repository.listOccupiedAppointments(dates[0], dates.at(-1) as string),
    ]);
    const visibleAppointments = excludeAppointment(appointments, excludeAppointmentId);
    return {
      success: true as const,
      openDates: dates.filter(
        (date) => resolveAvailableSlots(configuration, date, visibleAppointments, now).length,
      ),
    };
  } catch {
    return { success: false as const, reason: "load-error" as const };
  }
}

type AdminProjectionRequest = {
  token: string;
  excludeAppointmentId?: string;
};

export async function loadOpenDatesForAdmin(
  request: AdminProjectionRequest & { month: string },
  dependencies: AvailabilityAdminDependencies,
) {
  if (!(await isAuthorized(request.token, dependencies))) {
    return { success: false as const, reason: "forbidden" as const };
  }

  return getOpenDatesForMonth(
    request.month,
    resolveRepository(dependencies),
    dependencies.now(),
    request.excludeAppointmentId,
  );
}

export async function loadSlotsForAdmin(
  request: AdminProjectionRequest & { date: string },
  dependencies: AvailabilityAdminDependencies,
) {
  if (!(await isAuthorized(request.token, dependencies))) {
    return { success: false as const, reason: "forbidden" as const };
  }

  return getSlotsForDate(
    request.date,
    resolveRepository(dependencies),
    dependencies.now(),
    request.excludeAppointmentId,
  );
}

export async function loadAvailabilityForAdmin(
  token: string,
  dependencies: AvailabilityAdminDependencies,
): Promise<
  | { success: true; configuration: AvailabilityConfiguration }
  | { success: false; reason: "forbidden" | "load-error" }
> {
  if (!(await isAuthorized(token, dependencies))) return { success: false, reason: "forbidden" };

  try {
    return {
      success: true,
      configuration: await resolveRepository(dependencies).loadConfiguration(),
    };
  } catch {
    return { success: false, reason: "load-error" };
  }
}

export async function saveWeeklyScheduleForAdmin(
  request: { token: string; input: unknown; confirmConflicts: boolean },
  dependencies: AvailabilityAdminDependencies,
): Promise<AvailabilityMutationResult> {
  if (!(await isAuthorized(request.token, dependencies))) {
    return { success: false, reason: "forbidden" };
  }
  const repository = resolveRepository(dependencies);
  const parsed = parseWeeklySchedule(request.input);
  if (!parsed.success)
    return { success: false, reason: "validation", fieldErrors: parsed.fieldErrors };

  try {
    const now = dependencies.now();
    const { configuration, appointments } = await loadCandidateContext(repository, now);
    const candidate = applyWeeklySchedule(configuration, parsed.data.days);
    const conflicts = findScheduleConflicts(configuration, candidate, appointments, now);
    if (conflicts.length && !request.confirmConflicts) {
      return { success: false, reason: "conflicts", conflicts };
    }
    await repository.replaceWeeklySchedule(parsed.data.days);
    return { success: true, configuration: await repository.loadConfiguration() };
  } catch {
    return { success: false, reason: "storage-error" };
  }
}

export async function saveOverrideForAdmin(
  request: { token: string; input: unknown; confirmConflicts: boolean },
  dependencies: AvailabilityAdminDependencies,
): Promise<AvailabilityMutationResult> {
  if (!(await isAuthorized(request.token, dependencies))) {
    return { success: false, reason: "forbidden" };
  }
  const repository = resolveRepository(dependencies);
  const parsed = parseAvailabilityOverride(request.input);
  if (!parsed.success)
    return { success: false, reason: "validation", fieldErrors: parsed.fieldErrors };

  try {
    const now = dependencies.now();
    const { configuration, appointments } = await loadCandidateContext(repository, now);
    if (hasOverrideOverlap(parsed.data, configuration.overrides)) {
      return { success: false, reason: "overlap" };
    }
    const candidate = applyOverride(configuration, parsed.data);
    const conflicts = findScheduleConflicts(configuration, candidate, appointments, now);
    if (conflicts.length && !request.confirmConflicts) {
      return { success: false, reason: "conflicts", conflicts };
    }
    const saved = await repository.saveOverride(parsed.data);
    if (!saved.success) return { success: false, reason: "overlap" };
    return { success: true, configuration: await repository.loadConfiguration() };
  } catch {
    return { success: false, reason: "storage-error" };
  }
}

export async function deleteOverrideForAdmin(
  request: { token: string; id: string; confirmConflicts: boolean },
  dependencies: AvailabilityAdminDependencies,
): Promise<AvailabilityMutationResult> {
  if (!(await isAuthorized(request.token, dependencies))) {
    return { success: false, reason: "forbidden" };
  }
  const repository = resolveRepository(dependencies);

  try {
    const now = dependencies.now();
    const { configuration, appointments } = await loadCandidateContext(repository, now);
    if (!configuration.overrides.some((override) => override.id === request.id)) {
      return { success: false, reason: "not-found" };
    }
    const candidate = removeOverride(configuration, request.id);
    const conflicts = findScheduleConflicts(configuration, candidate, appointments, now);
    if (conflicts.length && !request.confirmConflicts) {
      return { success: false, reason: "conflicts", conflicts };
    }
    if (!(await repository.deleteOverride(request.id)))
      return { success: false, reason: "not-found" };
    return { success: true, configuration: await repository.loadConfiguration() };
  } catch {
    return { success: false, reason: "storage-error" };
  }
}
