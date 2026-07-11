import { BellRing, CalendarCheck2, CalendarRange, CircleAlert, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import type { Appointment, Customer } from "./dashboard-model";
import {
  appointmentStatusLabels,
  bookingTypeLabels,
  getDashboardMetrics,
  stageLabels,
  type AppointmentStatus,
  type CustomerStage,
} from "./dashboard-model";
import { DashboardEmptyState, MetricCard, StatusBadge } from "./dashboard-ui";

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
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

function isFollowUpCustomer(customer: Customer, now: Date) {
  const stale = now.getTime() - new Date(customer.updatedAt).getTime() >= 3 * 24 * 60 * 60 * 1000;
  return stale && !(["ready-delivery", "completed"] as CustomerStage[]).includes(customer.stage);
}

function InsightCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <article className="min-h-[218px] rounded-[10px] border border-[#e6e6e8] bg-white p-4 transition-all duration-200 hover:border-[#d8d8db] hover:shadow-[0_8px_24px_rgba(24,24,27,0.04)]">
      <h2 className="text-[10px] font-medium text-[#85868c]">{title}</h2>
      {children}
    </article>
  );
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
  const metrics = useMemo(
    () => getDashboardMetrics(customers, appointments, now),
    [appointments, customers, now],
  );
  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );
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
      dateKey(appointment.startsAt) === dateKey(tomorrow) &&
      appointment.reminderStatus === "scheduled",
  );
  const followUps = customers.filter((customer) => isFollowUpCustomer(customer, now));
  const statusCounts = (Object.keys(appointmentStatusLabels) as AppointmentStatus[]).map(
    (status) => ({
      status,
      count: appointments.filter((appointment) => appointment.status === status).length,
    }),
  );
  const maxStatusCount = Math.max(...statusCounts.map((item) => item.count), 1);
  const sentReminders = appointments.filter(
    (appointment) => appointment.reminderStatus === "sent",
  ).length;
  const activeReminders = appointments.filter(
    (appointment) => appointment.reminderStatus !== "not-scheduled",
  ).length;
  const reminderProgress = activeReminders
    ? Math.round((sentReminders / activeReminders) * 100)
    : 0;
  const advancedCustomers = customers.filter((customer) =>
    (["fitting", "ready-delivery", "completed"] as CustomerStage[]).includes(customer.stage),
  ).length;
  const customerProgress = customers.length
    ? Math.round((advancedCustomers / customers.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="إجمالي الحجوزات"
          value={appointments.length}
          hint="كل حجوزات المشغل"
          icon={CalendarCheck2}
        />
        <MetricCard
          label="مواعيد اليوم"
          value={metrics.today}
          hint="مواعيد مسجلة اليوم"
          icon={CalendarRange}
        />
        <MetricCard
          label="زبائن جدد"
          value={metrics.newCustomers}
          hint="بانتظار المتابعة"
          icon={UserPlus}
        />
        <MetricCard
          label="قيد المتابعة"
          value={metrics.needsFollowUp}
          hint="ملفات تحتاج إجراء"
          icon={CircleAlert}
        />
      </section>

      <section className="grid gap-2.5 lg:grid-cols-3">
        <InsightCard title="تقدم التذكيرات">
          <div className="flex h-[170px] flex-col items-center justify-center">
            <div className="relative size-28">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#f0f0f1" strokeWidth="9" />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="9"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={`${reminderProgress} 100`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <BellRing className="size-5 text-[#f28b52]" aria-hidden="true" />
                <span className="mt-1 text-xl font-semibold tabular-nums">{reminderProgress}%</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-medium text-[#3d3e42]">
              {sentReminders} تذكيرات مرسلة
            </p>
            <p className="mt-0.5 text-[8px] text-[#9a9ba0]">
              من أصل {activeReminders} تذكيرات مفعّلة
            </p>
          </div>
        </InsightCard>

        <InsightCard title="توزيع حالات الحجوزات">
          <div className="mt-5 flex h-[145px] items-end justify-center gap-5 border-b border-[#eeeeef] px-2 pb-0">
            {statusCounts.map(({ status, count }, index) => {
              const colors = ["bg-[#e85fa8]", "bg-[#2cc79a]", "bg-[#f39245]", "bg-[#7f55e8]"];
              return (
                <div key={status} className="flex h-full w-10 flex-col items-center justify-end">
                  <span className="mb-1 text-[8px] font-medium text-[#66676c] tabular-nums">
                    {count}
                  </span>
                  <div
                    className={`w-7 rounded-t-[6px] ${colors[index]} opacity-95`}
                    style={{ height: `${Math.max(18, (count / maxStatusCount) * 100)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[7px] text-[#8b8c91]">
            {statusCounts.map(({ status }) => (
              <span key={status}>{appointmentStatusLabels[status]}</span>
            ))}
          </div>
        </InsightCard>

        <InsightCard title="تقدم ملفات الزبائن">
          <div className="flex h-[174px] flex-col items-center justify-end">
            <div className="relative h-[104px] w-[210px] overflow-hidden">
              <svg viewBox="0 0 220 112" className="size-full" aria-hidden="true">
                <path
                  d="M20 100 A90 90 0 0 1 200 100"
                  fill="none"
                  stroke="#efeff0"
                  strokeWidth="18"
                  strokeLinecap="round"
                  pathLength="100"
                />
                <path
                  d="M20 100 A90 90 0 0 1 200 100"
                  fill="none"
                  stroke="url(#progress-gradient)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={`${customerProgress} 100`}
                />
                <defs>
                  <linearGradient id="progress-gradient" x1="0" x2="1">
                    <stop offset="0" stopColor="#3182f6" />
                    <stop offset="1" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-x-0 bottom-0 text-center">
                <p className="text-[25px] font-semibold leading-none tabular-nums">
                  {customerProgress}%
                </p>
                <p className="mt-1 text-[8px] text-[#919298]">في مراحل متقدمة</p>
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-[8px] text-[#8f9095]">
              <span>
                <i className="ml-1 inline-block size-1.5 rounded-full bg-[#3182f6]" />
                قيد العمل
              </span>
              <span>
                <i className="ml-1 inline-block size-1.5 rounded-full bg-[#8b5cf6]" />
                متقدم
              </span>
              <span>
                <i className="ml-1 inline-block size-1.5 rounded-full bg-[#dedee1]" />
                مكتمل
              </span>
            </div>
          </div>
        </InsightCard>
      </section>

      <section className="overflow-hidden rounded-[10px] border border-[#e6e6e8] bg-white">
        <div className="flex items-center justify-between border-b border-[#eeeeef] px-4 py-3">
          <div>
            <h2 className="text-[10px] font-medium text-[#77787e]">
              {range === "day" ? "مواعيد اليوم" : "مواعيد الأسبوع"}
            </h2>
            <p className="mt-1 text-[18px] font-semibold leading-none tabular-nums">
              {schedule.length}
            </p>
          </div>
          <div
            className="flex rounded-md border border-[#e6e6e8] bg-[#fafafa] p-0.5"
            aria-label="نطاق الجدول"
          >
            <button
              type="button"
              onClick={() => setRange("day")}
              className={`min-h-7 rounded-[4px] px-2.5 text-[9px] font-medium transition-colors ${range === "day" ? "bg-white text-[#242428] shadow-sm" : "text-[#929399]"}`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setRange("week")}
              className={`min-h-7 rounded-[4px] px-2.5 text-[9px] font-medium transition-colors ${range === "week" ? "bg-white text-[#242428] shadow-sm" : "text-[#929399]"}`}
            >
              الأسبوع
            </button>
          </div>
        </div>

        {schedule.length === 0 ? (
          <div className="p-4">
            <DashboardEmptyState
              title="لا توجد مواعيد"
              body="اختاري نطاقًا آخر أو أضيفي موعدًا جديدًا."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right">
              <thead className="bg-[#fcfcfc] text-[8px] font-medium text-[#999aa0]">
                <tr>
                  <th className="px-4 py-2.5">الزبونة</th>
                  <th className="px-3 py-2.5">الخدمة</th>
                  <th className="px-3 py-2.5">الغرض</th>
                  <th className="px-3 py-2.5">التاريخ والوقت</th>
                  <th className="px-4 py-2.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f1]">
                {schedule.map((appointment) => {
                  const customer = customersById.get(appointment.customerId);
                  return (
                    <tr key={appointment.id} className="transition-colors hover:bg-[#fcfcfd]">
                      <td className="px-4 py-3 text-[10px] font-medium text-[#333438]">
                        {customer?.name ?? "زبونة غير معروفة"}
                      </td>
                      <td className="px-3 py-3 text-[9px] text-[#76777d]">
                        {bookingTypeLabels[appointment.type]}
                      </td>
                      <td className="px-3 py-3 text-[9px] text-[#76777d]">{appointment.purpose}</td>
                      <td className="px-3 py-3 text-[9px] text-[#76777d]" dir="ltr">
                        {range === "week" ? `${dateLabel(appointment.startsAt)} · ` : ""}
                        {timeLabel(appointment.startsAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={appointment.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-2.5 lg:grid-cols-2">
        <article className="rounded-[10px] border border-[#e6e6e8] bg-white p-4">
          <h2 className="text-[10px] font-medium text-[#85868c]">تذكيرات الغد</h2>
          {reminders.length === 0 ? (
            <div className="mt-3">
              <DashboardEmptyState title="لا توجد تذكيرات مجدولة" body="ستظهر مواعيد الغد هنا." />
            </div>
          ) : (
            <div className="mt-3 divide-y divide-[#f0f0f1]">
              {reminders.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div>
                    <p className="text-[10px] font-medium">
                      {customersById.get(appointment.customerId)?.name}
                    </p>
                    <p className="mt-1 text-[8px] text-[#95969b]">{appointment.purpose}</p>
                  </div>
                  <span className="text-[8px] font-medium text-violet-600">مجدول</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-[10px] border border-[#e6e6e8] bg-white p-4">
          <h2 className="text-[10px] font-medium text-[#85868c]">بحاجة لمتابعة</h2>
          {followUps.length === 0 ? (
            <div className="mt-3">
              <DashboardEmptyState title="كل الملفات محدثة" body="لا توجد متابعة مطلوبة حاليًا." />
            </div>
          ) : (
            <div className="mt-3 divide-y divide-[#f0f0f1]">
              {followUps.map((customer) => (
                <a
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-[10px] transition-colors hover:text-violet-700"
                >
                  <span>
                    <span className="block font-medium">{customer.name}</span>
                    <span className="mt-1 block text-[8px] text-[#96979c]">
                      {stageLabels[customer.stage]}
                    </span>
                  </span>
                  <span className="text-[8px] text-[#77787d]">عرض الملف</span>
                </a>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
