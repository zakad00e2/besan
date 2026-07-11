import { createFileRoute } from "@tanstack/react-router";
import { DashboardCustomerProfile } from "@/features/dashboard/dashboard-customer-profile";
import { useDashboard } from "@/features/dashboard/dashboard-store";

export const Route = createFileRoute("/dashboard/customers/$id")({
  component: DashboardCustomerRoute,
});

function DashboardCustomerRoute() {
  const { id } = Route.useParams();
  const { state, dispatch } = useDashboard();
  const customer = state.customers.find((item) => item.id === id);

  if (!customer) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="font-medium">Customer not found</p>
        <a className="mt-3 inline-block text-sm text-violet-700" href="/dashboard/customers">
          Back to customers
        </a>
      </div>
    );
  }

  return (
    <DashboardCustomerProfile
      customer={customer}
      appointments={state.appointments}
      dispatch={dispatch}
    />
  );
}
