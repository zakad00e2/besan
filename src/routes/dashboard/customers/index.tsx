import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/customers/")({ component: DashboardCustomersRoute });

function DashboardCustomersRoute() {
  return <h2 className="text-xl font-semibold">دليل الزبائن</h2>;
}
