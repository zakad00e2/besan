import { createFileRoute } from "@tanstack/react-router";
import { DashboardBookings } from "@/features/dashboard/dashboard-bookings";
import { useDashboard } from "@/features/dashboard/dashboard-store";

export const Route = createFileRoute("/dashboard/bookings")({ component: DashboardBookingsRoute });

function DashboardBookingsRoute() {
  const { state, dispatch } = useDashboard();
  return (
    <DashboardBookings
      customers={state.customers}
      appointments={state.appointments}
      dispatch={dispatch}
    />
  );
}
