import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Appointment, Customer } from "./dashboard-model";
import { stageLabels } from "./dashboard-model";
import { DashboardEmptyState } from "./dashboard-ui";

export function DashboardCustomers({
  customers,
  appointments,
}: {
  customers: Customer[];
  appointments: Appointment[];
}) {
  const [query, setQuery] = useState("");
  const now = new Date();
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return customers.filter(
      (customer) =>
        !normalized ||
        `${customer.name} ${customer.phone}`.toLocaleLowerCase().includes(normalized),
    );
  }, [customers, query]);
  function nextAppointment(customerId: string) {
    return appointments
      .filter((item) => item.customerId === customerId && new Date(item.startsAt) >= now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  }
  return (
    <div className="space-y-5">
      <label className="relative block max-w-md text-xs font-medium text-slate-600">
        البحث عن زبونة
        <Search className="pointer-events-none absolute bottom-3 right-3 size-4 text-slate-400" />
        <input
          aria-label="البحث عن زبونة"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 pr-9 text-sm"
        />
      </label>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {visible.length === 0 ? (
          <div className="p-4">
            <DashboardEmptyState title="لا توجد نتائج" body="تحققي من الاسم أو رقم الهاتف." />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((customer) => {
              const upcoming = nextAppointment(customer.id);
              return (
                <a
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className="grid gap-2 px-4 py-4 transition-colors hover:bg-violet-50 sm:grid-cols-[1.2fr_1fr_1fr_1fr]"
                >
                  <span className="font-medium text-slate-950">{customer.name}</span>
                  <span className="text-sm text-slate-500" dir="ltr">
                    {customer.phone}
                  </span>
                  <span className="text-sm text-slate-600">{stageLabels[customer.stage]}</span>
                  <span className="text-sm text-slate-500">
                    {upcoming ? (
                      <span dir="ltr">
                        {upcoming.startsAt.slice(0, 10)} · {upcoming.startsAt.slice(11, 16)}
                      </span>
                    ) : (
                      "لا يوجد موعد قادم"
                    )}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
