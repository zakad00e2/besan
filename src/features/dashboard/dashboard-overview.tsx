import { CalendarCheck2, CalendarRange, CircleAlert, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import type { Appointment, Customer } from "./dashboard-model";
import {
  bookingTypeLabels,
  getDashboardMetrics,
  stageLabels,
  type CustomerStage,
} from "./dashboard-model";
import { DashboardEmptyState, DashboardSectionHeading, MetricCard, StatusBadge } from "./dashboard-ui";

type ScheduleRange = "day" | "week";

function dateKey(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("ar", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(date),
  );
}

function timeLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(date),
  );
}

function isFollowUpCustomer(customer: Customer, now: Date) {
  const stale = now.getTime() - new Date(customer.updatedAt).getTime() >= 3 * 24 * 60 * 60 * 1000;
  return stale && !(["ready-delivery", "completed"] as CustomerStage[]).includes(customer.stage);
}

export function DashboardOverview({
  customers,
  appointments,
  now = new Date(),
}: {
  customers: Customer[];
  appointments: Appointment[];
  now?: Date;
}) {
  const [range, setRange] = useState<ScheduleRange>("day");
  const metrics = useMemo(() => getDashboardMetrics(customers, appointments, now), [appointments, customers, now]);
  const customersById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const dayKey = dateKey(now);
  const weekEnd = new Date(now);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const schedule = appointments
    .filter((appointment) => {
      if (range === "day") return dateKey(appointment.startsAt) === dayKey;
      const appointmentDate = new Date(appointment.startsAt);
      return appointmentDate >= now && appointmentDate < weekEnd;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const reminders = appointments.filter(
    (appointment) =>
      dateKey(appointment.startsAt) === dateKey(tomorrow) && appointment.reminderStatus === "scheduled",
  );
  const followUps = customers.filter((customer) => isFollowUpCustomer(customer, now));

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="مواعيد اليوم" value={metrics.today} hint="مواعيد مسجلة لهذا اليوم" icon={CalendarCheck2} />
        <MetricCard label="هذا الأسبوع" value={metrics.thisWeek} hint="مواعيد الأيام السبعة القادمة" icon={CalendarRange} />
        <MetricCard label="زبائن جدد" value={metrics.newCustomers} hint="استفسارات بانتظار المتابعة" icon={UserPlus} />
        <MetricCard label="بحاجة لمتابعة" value={metrics.needsFollowUp} hint="ملفات دون تحديث حديث" icon={CircleAlert} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <DashboardSectionHeading
          title={range === "day" ? "جدول اليوم" : "جدول الأسبوع"}
          action={
            <div className="flex rounded-lg bg-slate-100 p-1" aria-label="نطاق الجدول">
              <button
                type="button"
                onClick={() => setRange("day")}
                className={`min-h-8 rounded-md px-3 text-xs font-medium ${range === "day" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={() => setRange("week")}
                className={`min-h-8 rounded-md px-3 text-xs font-medium ${range === "week" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
              >
                الأسبوع
              </button>
            </div>
          }
        />

        {schedule.length === 0 ? (
          <DashboardEmptyState title="لا توجد مواعيد" body="اختاري نطاقًا آخر أو أضيفي موعدًا جديدًا." />
        ) : (
          <div className="divide-y divide-slate-100">
            {schedule.map((appointment) => {
              const customer = customersById.get(appointment.customerId);
              return (
                <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{customer?.name ?? "زبونة غير معروفة"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {appointment.purpose} · {bookingTypeLabels[appointment.type]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500" dir="ltr">
                      {range === "week" ? `${dateLabel(appointment.startsAt)} · ` : ""}
                      {timeLabel(appointment.startsAt)}
                    </span>
                    <StatusBadge status={appointment.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <DashboardSectionHeading title="تذكيرات الغد" />
          {reminders.length === 0 ? (
            <DashboardEmptyState title="لا توجد تذكيرات مجدولة" body="ستظهر المواعيد المجدولة للغد هنا." />
          ) : (
            <div className="space-y-3">
              {reminders.map((appointment) => (
                <div key={appointment.id} className="rounded-lg bg-violet-50 px-3 py-3 text-sm text-violet-950">
                  <p className="font-medium">{customersById.get(appointment.customerId)?.name}</p>
                  <p className="mt-1 text-xs text-violet-700">{appointment.purpose} — عبر WhatsApp وتنبيه المشرفة</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <DashboardSectionHeading title="بحاجة لمتابعة" />
          {followUps.length === 0 ? (
            <DashboardEmptyState title="كل الملفات محدثة" body="لا توجد زبائن بحاجة لمتابعة حاليًا." />
          ) : (
            <div className="space-y-3">
              {followUps.map((customer) => (
                <a
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-3 transition-colors hover:border-violet-200 hover:bg-violet-50"
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-900">{customer.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">{stageLabels[customer.stage]}</span>
                  </span>
                  <span className="text-xs text-violet-700">عرض الملف</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
