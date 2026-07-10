import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/availability")({ component: DashboardAvailabilityRoute });

function DashboardAvailabilityRoute() {
  return <h2 className="text-xl font-semibold">المواعيد المتاحة</h2>;
}
