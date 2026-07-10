import type { LucideIcon } from "lucide-react";
import { CalendarX2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { appointmentStatusLabels, type AppointmentStatus } from "./dashboard-model";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </section>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const classes: Record<AppointmentStatus, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    completed: "border-slate-200 bg-slate-100 text-slate-600",
    cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", classes[status])}>
      {appointmentStatusLabels[status]}
    </span>
  );
}

export function DashboardEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
      <CalendarX2 className="size-5 text-slate-400" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{body}</p>
    </div>
  );
}

export function DashboardSectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {action}
    </div>
  );
}
