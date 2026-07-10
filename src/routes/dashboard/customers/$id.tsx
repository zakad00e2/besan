import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/customers/$id")({ component: DashboardCustomerRoute });

function DashboardCustomerRoute() {
  const { id } = Route.useParams();

  return <p>ملف الزبونة: {id}</p>;
}
