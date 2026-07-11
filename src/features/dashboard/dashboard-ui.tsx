import type { LucideIcon } from "lucide-react";
import { CalendarX2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { appointmentStatusLabels, type AppointmentStatus } from "./dashboard-model";

export function MetricCard({
  label,
  value,
  changePercent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  changePercent: number | null;
  icon: LucideIcon;
}) {
  return (
    <section className="group rounded-[10px] border border-[#e7e7e9] bg-white px-3.5 py-3 transition-all duration-200 hover:border-[#d9d9dc] hover:shadow-[0_5px_18px_rgba(24,24,27,0.045)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-medium text-[#55565b]">{label}</span>
        <Icon className="size-3.5 stroke-[1.7] text-[#a4a5aa]" aria-hidden="true" />
      </div>
      <p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.035em] text-[#18181b] tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[8px] text-[#9a9ba0]">
        {changePercent === null ? (
          <span className="font-semibold text-[#16a67a]">New</span>
        ) : (
          <span
            className={cn(
              "font-semibold",
              changePercent > 0
                ? "text-[#16a67a]"
                : changePercent < 0
                  ? "text-[#e05252]"
                  : "text-[#9a9ba0]",
            )}
          >
            {changePercent > 0 ? "+" : ""}
            {changePercent}%
          </span>
        )}{" "}
        · Compared with last month
      </p>
    </section>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const classes: Record<AppointmentStatus, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    completed: "border-[#dedee1] bg-[#f5f5f6] text-[#66676c]",
    cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-medium",
        classes[status],
      )}
    >
      {appointmentStatusLabels[status]}
    </span>
  );
}

export function DashboardEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-[#e4e4e6] bg-[#fcfcfc] px-4 text-center">
      <CalendarX2 className="size-4 text-[#aaabb0]" aria-hidden="true" />
      <p className="mt-2 text-[11px] font-medium text-[#5f6065]">{title}</p>
      <p className="mt-1 text-[9px] text-[#9a9ba0]">{body}</p>
    </div>
  );
}

export function DashboardSectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[11px] font-medium text-[#77787e]">{title}</h2>
      {action}
    </div>
  );
}
