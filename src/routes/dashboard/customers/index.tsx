import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/features/auth/neon-auth-client";
import { CustomerListSkeleton, DashboardCustomers } from "@/features/dashboard/dashboard-customers";
import { usePersistedBookingData } from "@/features/dashboard/use-persisted-booking-data";

export const Route = createFileRoute("/dashboard/customers/")({
  component: DashboardCustomersRoute,
});

function DashboardCustomersRoute() {
  const { data: session } = authClient.useSession();
  const { data, error } = usePersistedBookingData(Boolean(session?.user));

  if (!session?.user) return <a href="/auth" className="text-sm text-violet-700 underline">Sign in to view customers.</a>;
  if (error) return <p role="alert" className="text-sm text-rose-600">{error}</p>;
  if (!data) return <CustomerListSkeleton />;
  return <DashboardCustomers customers={data.customers} appointments={data.appointments} />;
}
