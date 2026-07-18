import { useMemo } from "react";
import type { Appointment, Customer } from "./dashboard-model";
import { getCustomerProfileStageLabel } from "./dashboard-customer-stage";
import { DashboardEmptyState, StatusBadge } from "./dashboard-ui";

export function DashboardCustomerProfile({
  customer,
  appointments,
  now = new Date(),
}: {
  customer: Customer;
  appointments: Appointment[];
  now?: Date;
}) {
  const { upcoming, previous, stageNotes } = useMemo(() => {
    const all = appointments
      .filter((item) => item.customerId === customer.id)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return {
      upcoming: all.filter(
        (item) =>
          !["completed", "cancelled"].includes(item.status) && new Date(item.startsAt) >= now,
      ),
      previous: all
        .filter(
          (item) =>
            ["completed", "cancelled"].includes(item.status) || new Date(item.startsAt) < now,
        )
        .reverse(),
      stageNotes: all.filter((item) => item.notes?.trim()).reverse(),
    };
  }, [appointments, customer.id, now]);
  const customerStageLabel = getCustomerProfileStageLabel({ customer, appointments, now });
  const appointmentList = (items: Appointment[], empty: string) =>
    items.length === 0 ? (
      <DashboardEmptyState title={empty} body="Details will appear here when available." />
    ) : (
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 py-2">
            <div>
              <p className="text-xs font-normal leading-snug">{item.purpose}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-slate-500" dir="ltr">
                {item.startsAt.slice(0, 10)} · {item.startsAt.slice(11, 16)}
              </p>
            </div>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
    );
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium leading-tight">{customer.name}</h2>
            <p className="mt-0.5 text-xs leading-snug text-slate-500" dir="ltr">
              {customer.phone}
            </p>
          </div>
          <div>
            <p className="text-[10px] leading-none text-slate-500">Customer stage</p>
            <p aria-label="Customer stage" className="mt-0.5 text-xs font-normal leading-tight text-violet-700">
              {customerStageLabel}
            </p>
          </div>
        </div>
      </section>
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="mb-1.5 text-sm font-medium leading-tight">Upcoming appointments</h3>
          {appointmentList(upcoming, "No upcoming appointments")}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="mb-1.5 text-sm font-medium leading-tight">Previous appointments</h3>
          {appointmentList(previous, "No previous appointments")}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-2 font-semibold leading-tight">Notes</h3>
        {stageNotes.length === 0 ? (
          <p className="text-sm leading-snug text-slate-500">No notes.</p>
        ) : (
          <div className="space-y-2">
            {stageNotes.map((item) => (
              <div key={item.id} className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-xs font-medium leading-snug text-slate-700">{item.purpose}</p>
                <p className="mt-1 text-sm leading-snug">{item.notes}</p>
                <p className="mt-0.5 text-xs leading-tight text-slate-500" dir="ltr">
                  {item.startsAt.slice(0, 10)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
