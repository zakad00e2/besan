import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getBookings } from "@/features/auth/admin.functions";
import { authClient, neonAuth } from "@/features/auth/neon-auth-client";
import type { Appointment, Customer } from "@/features/dashboard/dashboard-model";
import { DashboardBookings } from "@/features/dashboard/dashboard-bookings";
import { useDashboard } from "@/features/dashboard/dashboard-store";

export const Route = createFileRoute("/dashboard/bookings")({ component: DashboardBookingsRoute });

function DashboardBookingsRoute() {
  const { dispatch } = useDashboard();
  const { data: session } = authClient.useSession();
  const [bookings, setBookings] = useState<{ customers: Customer[]; appointments: Appointment[] }>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user) return;
    let active = true;
    void (async () => {
      const token = await neonAuth.getJWTToken();
      if (!token) {
        if (active) setError("Please sign in again.");
        return;
      }
      const result = await getBookings({ data: { token } });
      if (!active) return;
      if (!result.success) {
        setError(result.reason === "forbidden" ? "You do not have access to bookings." : "Could not load bookings.");
        return;
      }
      setBookings({
        customers: result.bookings.map((booking) => ({
          id: booking.id,
          name: booking.fullName,
          phone: booking.mobile,
          stage: "new-inquiry",
          updatedAt: booking.createdAt,
          notes: [],
          activity: [],
        })),
        appointments: result.bookings.map((booking) => ({
          id: booking.id,
          customerId: booking.id,
          type: "design",
          purpose: booking.notes ? `${booking.appointmentType} · ${booking.notes}` : booking.appointmentType,
          startsAt: `${booking.appointmentDate}T${booking.appointmentTime}:00.000Z`,
          endsAt: `${booking.appointmentDate}T${booking.appointmentTime}:00.000Z`,
          status: booking.status,
          reminderStatus: booking.reminderStatus,
        })),
      });
    })();
    return () => {
      active = false;
    };
  }, [session?.user]);

  if (!session?.user) return <a href="/auth" className="text-sm text-violet-700 underline">Sign in to view bookings.</a>;
  if (error) return <p role="alert" className="text-sm text-rose-600">{error}</p>;
  if (!bookings) return <p className="text-sm text-slate-600">Loading bookings…</p>;
  return (
    <DashboardBookings
      customers={bookings.customers}
      appointments={bookings.appointments}
      dispatch={dispatch}
    />
  );
}
