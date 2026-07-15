import { useCallback, useEffect, useRef, useState } from "react";
import { neonAuth } from "@/features/auth/neon-auth-client";
import {
  deleteAdminAvailabilityOverride,
  getAdminAvailability,
  saveAdminAvailabilityOverride,
  saveAdminWeeklySchedule,
} from "@/features/availability/availability.functions";
import type {
  AvailabilityConfiguration,
  AvailabilityOverrideInput,
  WeeklyScheduleInput,
} from "@/features/availability/availability-domain";
import type { AvailabilityMutationResult } from "@/features/availability/availability-service";

export type DashboardAvailabilityController = {
  configuration: AvailabilityConfiguration | undefined;
  loading: boolean;
  pending: boolean;
  error: string;
  reload(): Promise<void>;
  saveWeekly(
    input: WeeklyScheduleInput,
    confirmConflicts: boolean,
  ): Promise<AvailabilityMutationResult>;
  saveOverride(
    input: AvailabilityOverrideInput,
    confirmConflicts: boolean,
  ): Promise<AvailabilityMutationResult>;
  deleteOverride(id: string, confirmConflicts: boolean): Promise<AvailabilityMutationResult>;
};

const forbidden = { success: false, reason: "forbidden" } as const;
const storageError = { success: false, reason: "storage-error" } as const;

export function useDashboardAvailability(enabled: boolean): DashboardAvailabilityController {
  const [configuration, setConfiguration] = useState<AvailabilityConfiguration>();
  const [loading, setLoading] = useState(enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const mutationActive = useRef(false);

  const getToken = useCallback(async () => {
    const token = await neonAuth.getJWTToken();
    if (!token) setError("Please sign in again.");
    return token;
  }, []);

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;
      const result = await getAdminAvailability({ data: { token } });
      if (result.success) setConfiguration(result.configuration);
      else
        setError(
          result.reason === "forbidden" ? "Please sign in again." : "Could not load availability.",
        );
    } catch {
      setError("Could not load availability.");
    } finally {
      setLoading(false);
    }
  }, [enabled, getToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const mutate = useCallback(
    async (run: (token: string) => Promise<AvailabilityMutationResult>) => {
      if (mutationActive.current) return storageError;
      mutationActive.current = true;
      setPending(true);
      setError("");
      try {
        const token = await getToken();
        if (!token) return forbidden;
        const result = await run(token);
        if (result.success) setConfiguration(result.configuration);
        else if (result.reason === "forbidden") setError("Please sign in again.");
        else if (result.reason === "storage-error") setError("Could not save availability.");
        return result;
      } catch {
        setError("Could not save availability.");
        return storageError;
      } finally {
        mutationActive.current = false;
        setPending(false);
      }
    },
    [getToken],
  );

  const saveWeekly = useCallback(
    (input: WeeklyScheduleInput, confirmConflicts: boolean) =>
      mutate((token) => saveAdminWeeklySchedule({ data: { token, input, confirmConflicts } })),
    [mutate],
  );
  const saveOverride = useCallback(
    (input: AvailabilityOverrideInput, confirmConflicts: boolean) =>
      mutate((token) =>
        saveAdminAvailabilityOverride({ data: { token, input, confirmConflicts } }),
      ),
    [mutate],
  );
  const deleteOverride = useCallback(
    (id: string, confirmConflicts: boolean) =>
      mutate((token) => deleteAdminAvailabilityOverride({ data: { token, id, confirmConflicts } })),
    [mutate],
  );

  return {
    configuration,
    loading,
    pending,
    error,
    reload,
    saveWeekly,
    saveOverride,
    deleteOverride,
  };
}
