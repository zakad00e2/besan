import { useCallback, useRef, useState } from "react";
import {
  getAdminBookingAvailabilityDay,
  getAdminBookingAvailabilityMonth,
} from "@/features/availability/availability.functions";
import type { AvailableSlot } from "@/features/availability/availability-domain";
import { neonAuth } from "@/features/auth/neon-auth-client";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function useAdminBookingAvailability() {
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState("");
  const latestRequest = useRef(0);
  const latestMonthRequest = useRef(0);
  const latestDateRequest = useRef(0);

  const loadMonth = useCallback(async (month: Date, excludeAppointmentId?: string) => {
    const requestId = ++latestRequest.current;
    const monthRequestId = ++latestMonthRequest.current;
    setMonthLoading(true);
    setSlots([]);
    setError("");
    try {
      const token = await neonAuth.getJWTToken();
      if (requestId !== latestRequest.current) return;
      if (!token) {
        setOpenDates([]);
        setError("Please sign in again.");
        return;
      }
      const result = await getAdminBookingAvailabilityMonth({
        data: { token, month: monthKey(month), excludeAppointmentId },
      });
      if (requestId !== latestRequest.current) return;
      if (!result.success) {
        setOpenDates([]);
        setError(
          result.reason === "forbidden"
            ? "Please sign in again."
            : "Could not load available appointments.",
        );
        return;
      }
      setOpenDates(result.openDates);
    } catch {
      if (requestId === latestRequest.current) {
        setOpenDates([]);
        setError("Could not load available appointments.");
      }
    } finally {
      if (monthRequestId === latestMonthRequest.current) setMonthLoading(false);
    }
  }, []);

  const loadDate = useCallback(async (date: string, excludeAppointmentId?: string) => {
    const requestId = ++latestRequest.current;
    const dateRequestId = ++latestDateRequest.current;
    setSlotsLoading(true);
    setSlots([]);
    setError("");
    try {
      const token = await neonAuth.getJWTToken();
      if (requestId !== latestRequest.current) return;
      if (!token) {
        setError("Please sign in again.");
        return;
      }
      const result = await getAdminBookingAvailabilityDay({
        data: { token, date, excludeAppointmentId },
      });
      if (requestId !== latestRequest.current) return;
      if (!result.success) {
        setError(
          result.reason === "forbidden"
            ? "Please sign in again."
            : "Could not load available appointments.",
        );
        return;
      }
      setSlots(result.slots);
    } catch {
      if (requestId === latestRequest.current) setError("Could not load available appointments.");
    } finally {
      if (dateRequestId === latestDateRequest.current) setSlotsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    latestRequest.current += 1;
    setOpenDates([]);
    setSlots([]);
    setError("");
    setMonthLoading(false);
    setSlotsLoading(false);
  }, []);

  return { openDates, slots, monthLoading, slotsLoading, error, loadMonth, loadDate, clear };
}
