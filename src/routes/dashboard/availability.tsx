import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/features/auth/neon-auth-client";
import { DashboardAvailability } from "@/features/dashboard/dashboard-availability";
import { useDashboardAvailability } from "@/features/dashboard/use-dashboard-availability";

export const Route = createFileRoute("/dashboard/availability")({
  component: DashboardAvailabilityRoute,
});

function DashboardAvailabilityRoute() {
  const { data: session } = authClient.useSession();
  const controller = useDashboardAvailability(Boolean(session?.user));

  if (controller.loading) return <p className="text-sm text-slate-600">Loading availability…</p>;
  if (controller.error || !controller.configuration) {
    return (
      <div role="alert" className="space-y-3 text-sm text-rose-600">
        <p>{controller.error || "Could not load availability."}</p>
        <button type="button" className="underline" onClick={() => void controller.reload()}>
          Try again
        </button>
      </div>
    );
  }
  return (
    <DashboardAvailability
      configuration={controller.configuration}
      pending={controller.pending}
      onSaveWeekly={controller.saveWeekly}
      onSaveOverride={controller.saveOverride}
      onDeleteOverride={controller.deleteOverride}
    />
  );
}
