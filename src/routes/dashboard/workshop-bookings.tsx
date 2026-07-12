import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getWorkshopBookings, updateWorkshopBookingStatus } from "@/features/auth/admin.functions";
import { authClient, neonAuth } from "@/features/auth/neon-auth-client";
import { DashboardWorkshopBookings } from "@/features/dashboard/dashboard-workshop-bookings";
import type {
  WorkshopBookingListItem,
  WorkshopBookingStatus,
} from "@/features/workshop-booking/workshop-booking";

export const Route = createFileRoute("/dashboard/workshop-bookings")({
  component: DashboardWorkshopBookingsRoute,
});

function DashboardWorkshopBookingsRoute() {
  const { data: session } = authClient.useSession();
  const [bookings, setBookings] = useState<WorkshopBookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState("");

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const token = await neonAuth.getJWTToken();
        if (!token) {
          if (active) setError("Please sign in again.");
          return;
        }
        const result = await getWorkshopBookings({ data: { token } });
        if (!active) return;
        if (!result.success) {
          setError(
            result.reason === "forbidden"
              ? "You do not have access to workshop bookings."
              : "Could not load workshop bookings.",
          );
          return;
        }
        setBookings(result.bookings);
      } catch {
        if (active) setError("Could not load workshop bookings.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session?.user]);

  async function handleStatusChange(id: string, status: WorkshopBookingStatus) {
    setUpdatingId(id);
    setUpdateError("");
    try {
      const token = await neonAuth.getJWTToken();
      if (!token) {
        setUpdateError("Please sign in again before updating this booking.");
        return;
      }
      const result = await updateWorkshopBookingStatus({ data: { token, id, status } });
      if (!result.success) {
        setUpdateError(
          result.reason === "forbidden"
            ? "You do not have access to update workshop bookings."
            : result.reason === "not-found"
              ? "This workshop booking no longer exists."
              : "Could not update this workshop booking.",
        );
        return;
      }
      setBookings((current) =>
        current.map((booking) => (booking.id === result.booking.id ? result.booking : booking)),
      );
    } catch {
      setUpdateError("Could not update this workshop booking.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (!session?.user)
    return (
      <a href="/auth" className="text-sm text-violet-700 underline">
        Sign in to view workshop bookings.
      </a>
    );
  if (loading) return <p className="text-sm text-slate-600">Loading workshop bookings…</p>;
  if (error)
    return (
      <p role="alert" className="text-sm text-rose-600">
        {error}
      </p>
    );

  return (
    <DashboardWorkshopBookings
      bookings={bookings}
      onStatusChange={handleStatusChange}
      updatingId={updatingId}
      updateError={updateError}
    />
  );
}
