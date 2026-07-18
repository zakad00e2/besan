import { useCallback, useEffect, useState } from "react";
import {
  getBookings,
  getBookingsPage,
  markBookingsPageSeen,
} from "@/features/auth/admin.functions";
import { neonAuth } from "@/features/auth/neon-auth-client";
import type { BookingListItem } from "@/features/book-call/booking-domain";
import { normalizeBookingList, type DashboardBookingData } from "./dashboard-booking-data";

type PersistedBookingDataOptions = { trackBookingPageVisit?: boolean };

export function getNewBookingIds(bookings: BookingListItem[], lastSeenAt: string | null) {
  if (!lastSeenAt) return new Set<string>();
  const checkpoint = new Date(lastSeenAt).getTime();
  return new Set(
    bookings.filter((booking) => new Date(booking.createdAt).getTime() > checkpoint).map(({ id }) => id),
  );
}

export function usePersistedBookingData(
  enabled: boolean,
  { trackBookingPageVisit = false }: PersistedBookingDataOptions = {},
) {
  const [data, setData] = useState<DashboardBookingData>();
  const [newBookingIds, setNewBookingIds] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setData(undefined);
      setNewBookingIds(new Set());
      return;
    }
    setError("");
    setLoading(true);
    setNewBookingIds(new Set());
    try {
      const token = await neonAuth.getJWTToken();
      if (!token) {
        setError("Please sign in again.");
        return;
      }
      const result = trackBookingPageVisit
        ? await getBookingsPage({ data: { token } })
        : await getBookings({ data: { token } });
      if (!result.success) {
        setError(
          result.reason === "forbidden"
            ? "You do not have access to bookings."
            : "Could not load bookings.",
        );
        return;
      }
      setData(normalizeBookingList(result.bookings));
      if (trackBookingPageVisit && "lastSeenAt" in result && "snapshotAt" in result) {
        setNewBookingIds(getNewBookingIds(result.bookings, result.lastSeenAt));
        void markBookingsPageSeen({ data: { token, seenAt: result.snapshotAt } }).catch(() => undefined);
      }
    } catch {
      setError("Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }, [enabled, trackBookingPageVisit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, newBookingIds, setData, error, loading, reload };
}
