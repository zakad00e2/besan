import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/bookings")({ component: DashboardBookingsRoute });

function DashboardBookingsRoute() {
  return <h2 className="text-xl font-semibold">كل الحجوزات</h2>;
}
