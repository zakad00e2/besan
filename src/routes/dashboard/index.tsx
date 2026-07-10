import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({ component: DashboardIndexRoute });

function DashboardIndexRoute() {
  return <h2 className="text-xl font-semibold">نظرة عامة</h2>;
}
