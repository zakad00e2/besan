import { useCallback, useState } from "react";
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

  const loadMonth = useCallback(async (month: Date) => {
    setMonthLoading(true);
    setError("");
    try {
      const result = await getPublicAvailabilityMonth({ data: { month: monthKey(month) } });
      if (!result.success) {
        setOpenDates([]);
        setError("Could not load available appointments.");
        return;
      }
      setOpenDates(result.openDates);
    } catch {
      setOpenDates([]);
      setError("Could not load available appointments.");
    } finally {
      setMonthLoading(false);
    }
  }, []);

  const loadDate = useCallback(async (date: string) => {
    setSlotsLoading(true);
    setError("");
    try {
      const result = await getPublicAvailabilityDay({ data: { date } });
      if (!result.success) {
        setSlots([]);
        setError("Could not load available appointments.");
        return;
      }
      setSlots(result.slots);
    } catch {
      setSlots([]);
      setError("Could not load available appointments.");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  return { openDates, slots, monthLoading, slotsLoading, error, loadMonth, loadDate };
}
