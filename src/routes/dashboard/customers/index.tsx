import { createFileRoute } from "@tanstack/react-router";
import { DashboardCustomers } from "@/features/dashboard/dashboard-customers";
import { useDashboard } from "@/features/dashboard/dashboard-store";

export const Route = createFileRoute("/dashboard/customers/")({
  component: DashboardCustomersRoute,
});

function DashboardCustomersRoute() {
  const { state } = useDashboard();
  return <DashboardCustomers customers={state.customers} appointments={state.appointments} />;
}
