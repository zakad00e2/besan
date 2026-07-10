import { createFileRoute } from "@tanstack/react-router";
import { DashboardAvailability } from "@/features/dashboard/dashboard-availability";
import { useDashboard } from "@/features/dashboard/dashboard-store";

export const Route = createFileRoute("/dashboard/availability")({
  component: DashboardAvailabilityRoute,
});

function DashboardAvailabilityRoute() {
  const { state, dispatch } = useDashboard();
  return (
    <DashboardAvailability
      availability={state.availability}
      reminderSettings={state.reminderSettings}
      dispatch={dispatch}
    />
  );
}
