import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { DashboardProvider } from "@/features/dashboard/dashboard-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | Besan Khalaily" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <DashboardProvider>
      <DashboardShell>
        <Outlet />
      </DashboardShell>
    </DashboardProvider>
  );
}
