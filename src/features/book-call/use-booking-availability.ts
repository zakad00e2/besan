import { useCallback, useRef, useState } from "react";
import {
  getPublicAvailabilityDay,
  getPublicAvailabilityMonth,
} from "@/features/availability/availability.functions";
import type { AvailableSlot } from "@/features/availability/availability-domain";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function useBookingAvailability() {
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState("");
  const latestMonthRequest = useRef(0);
  const latestDateRequest = useRef(0);
  const latestAvailabilityRequest = useRef(0);

  const loadMonth = useCallback(async (month: Date) => {
    const monthRequestId = ++latestMonthRequest.current;
    const requestId = ++latestAvailabilityRequest.current;
    setMonthLoading(true);
    setError("");
    try {
      const result = await getPublicAvailabilityMonth({ data: { month: monthKey(month) } });
      if (requestId !== latestAvailabilityRequest.current) return;
      if (!result.success) {
        setOpenDates([]);
        setError("Could not load available appointments.");
        return;
      }
      setOpenDates(result.openDates);
    } catch {
      if (requestId !== latestAvailabilityRequest.current) return;
      setOpenDates([]);
      setError("Could not load available appointments.");
    } finally {
      if (monthRequestId === latestMonthRequest.current) setMonthLoading(false);
    }
  }, []);

  const loadDate = useCallback(async (date: string) => {
    const dateRequestId = ++latestDateRequest.current;
    const requestId = ++latestAvailabilityRequest.current;
    setSlotsLoading(true);
    setError("");
    try {
      const result = await getPublicAvailabilityDay({ data: { date } });
      if (requestId !== latestAvailabilityRequest.current) return;
      if (!result.success) {
        setSlots([]);
        setError("Could not load available appointments.");
        return;
      }
      setSlots(result.slots);
    } catch {
      if (requestId !== latestAvailabilityRequest.current) return;
      setSlots([]);
      setError("Could not load available appointments.");
    } finally {
      if (dateRequestId === latestDateRequest.current) setSlotsLoading(false);
    }
  }, []);

  return { openDates, slots, monthLoading, slotsLoading, error, loadMonth, loadDate };
}
