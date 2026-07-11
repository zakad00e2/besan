import { createFileRoute } from "@tanstack/react-router";
import { DashboardOverview } from "@/features/dashboard/dashboard-overview";
import { useDashboard } from "@/features/dashboard/dashboard-store";

export const Route = createFileRoute("/dashboard/")({ component: DashboardIndexRoute });

function DashboardIndexRoute() {
  const { state } = useDashboard();

  return (
    <DashboardOverview
      customers={state.customers}
      appointments={state.appointments}
      scoreDist={state.scoreDist}
      avgScore={state.avgScore}
    />
  );
}
