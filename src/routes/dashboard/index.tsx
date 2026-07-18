import { createFileRoute } from "@tanstack/react-router";
import { DashboardOverview } from "@/features/dashboard/dashboard-overview";
import { authClient } from "@/features/auth/neon-auth-client";
import { usePersistedBookingData } from "@/features/dashboard/use-persisted-booking-data";

export const Route = createFileRoute("/dashboard/")({ component: DashboardIndexRoute });

function DashboardIndexRoute() {
  const { data: session } = authClient.useSession();
  const { data, error, loading, reload } = usePersistedBookingData(Boolean(session?.user));
  if (error)
    return (
      <div role="alert" className="space-y-2 text-sm text-rose-600">
        <p>{error}</p>
        <button type="button" className="underline" onClick={() => void reload()}>
          Try again
        </button>
      </div>
    );
  if (loading || !data) return <p className="text-sm text-slate-600">Loading dashboard…</p>;

  return (
    <DashboardOverview
      customers={data.customers}
      appointments={data.appointments.filter((item) => item.type === "design")}
    />
  );
}
