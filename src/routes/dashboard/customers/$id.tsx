import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/features/auth/neon-auth-client";
import { DashboardCustomerProfile } from "@/features/dashboard/dashboard-customer-profile";
import { usePersistedBookingData } from "@/features/dashboard/use-persisted-booking-data";

export const Route = createFileRoute("/dashboard/customers/$id")({
  component: DashboardCustomerRoute,
});

function DashboardCustomerRoute() {
  const { id } = Route.useParams();
  const { data: session } = authClient.useSession();
  const { data, error } = usePersistedBookingData(Boolean(session?.user));

  if (!session?.user) return <a href="/auth" className="text-sm text-violet-700 underline">Sign in to view customers.</a>;
  if (error) return <p role="alert" className="text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-600">Loading customerâ€¦</p>;
  const customer = data.customers.find((item) => item.id === id);

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

  return <DashboardCustomerProfile customer={customer} appointments={data.appointments} />;
}
