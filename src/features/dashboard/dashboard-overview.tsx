import {
  CalendarCheck2,
  CalendarRange,
  CircleAlert,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import greetingAvatar from "@/assets/dashboard-greeting-avatar.jpeg";
import type { Appointment, Customer } from "./dashboard-model";
import {
  bookingTypeLabels,
  getDashboardMetrics,
  getDashboardMetricComparisons,
  getBookingStatusDistribution,
  reminderStatusLabels,
  stageLabels,
  type CustomerStage,
} from "./dashboard-model";
import { cn } from "@/lib/utils";
import {
  DashboardEmptyState,
  MetricCard,
  StatusBadge,
  dashboardToggleActiveClassName,
  dashboardToggleGroupClassName,
  dashboardToggleInactiveClassName,
} from "./dashboard-ui";
import { BookingStatusDistributionChart } from "./booking-status-distribution-chart";

type ScheduleRange = "day" | "week";

function dateKey(date: Date | string) {
  if (typeof date === "string") return date.slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" }).format(
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

export function getDashboardGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 5 || hour >= 22) return "Good night Besan 🌙";
  if (hour < 12) return "Good morning Besan 🫰";
  if (hour < 17) return "Good afternoon Besan 🫰";
  return "Good evening Besan 🫰";
}

export function getReminderProgress(appointments: Appointment[], now: Date) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const activeAppointments = appointments.filter(
    (appointment) =>
      new Date(appointment.startsAt) >= todayStart &&
      appointment.status !== "cancelled" &&
      appointment.reminderStatus !== "not-scheduled",
  );
  const sent = activeAppointments.filter((appointment) => appointment.reminderStatus === "sent").length;
  const active = activeAppointments.length;

  return { sent, active, percent: active ? Math.round((sent / active) * 100) : 0 };
}

function isFollowUpCustomer(customer: Customer, now: Date) {
  const stale = now.getTime() - new Date(customer.updatedAt).getTime() >= 3 * 24 * 60 * 60 * 1000;
  return stale && !(["ready-delivery", "completed"] as CustomerStage[]).includes(customer.stage);
}

function SectionTitle({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <h2 className="flex items-center gap-1.5 text-xs font-normal text-[#85868c]">
      <Icon className="size-3.5 shrink-0 stroke-[1.75] text-[#a4a5aa]" aria-hidden="true" />
      {title}
    </h2>
  );
}

function InsightCard({
  children,
  title,
  icon,
  centered = false,
}: {
  children: React.ReactNode;
  title?: string;
  icon?: LucideIcon;
  centered?: boolean;
}) {
  return (
    <article
      className={cn(
        "min-h-[218px] rounded-[10px] border border-[#e6e6e8] bg-white p-4 transition-[border-color,box-shadow] duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)] hover:border-[#d8d8db] hover:shadow-[0_8px_24px_rgba(24,24,27,0.04)]",
        centered && "flex flex-col",
      )}
    >
      {title && icon ? <SectionTitle title={title} icon={icon} /> : null}
      {centered ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {children}
        </div>
      ) : (
        children
      )}
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
  const comparisons = useMemo(
    () => getDashboardMetricComparisons(customers, appointments, now),
    [appointments, customers, now],
  );
  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );
  const statusDist = useMemo(() => getBookingStatusDistribution(appointments), [appointments]);
  const dayKey = dateKey(now);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
      appointment.status !== "cancelled" &&
      appointment.reminderStatus !== "sent",
  );
  const followUps = customers.filter((customer) => isFollowUpCustomer(customer, now));

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total bookings"
          value={appointments.length}
          changePercent={comparisons.totalBookings.changePercent}
          icon={CalendarCheck2}
        />
        <MetricCard
          label="Today's appointments"
          value={metrics.today}
          changePercent={comparisons.todayAppointments.changePercent}
          icon={CalendarRange}
        />
        <MetricCard
          label="New customers"
          value={metrics.newCustomers}
          changePercent={comparisons.newCustomers.changePercent}
          icon={UserPlus}
        />
        <MetricCard
          label="Needs follow-up"
          value={metrics.needsFollowUp}
          changePercent={comparisons.needsFollowUp.changePercent}
          icon={CircleAlert}
        />
      </section>

      <section className="grid gap-2.5 lg:grid-cols-3">
        <InsightCard centered>
          <div className="flex size-48 items-center justify-center">
            <div className="flex size-40 items-center justify-center overflow-hidden rounded-full bg-[#ff9f43]">
              <img src={greetingAvatar} alt="" className="size-full object-cover" />
            </div>
          </div>
          <p className="mt-4 text-base font-normal leading-tight text-[#1f1f23]">
            {getDashboardGreeting(now)}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-[#94959b]">
            Your appointments, all in one place.
          </p>
        </InsightCard>

        <BookingStatusDistributionChart statusDist={statusDist} />

        <article className="min-h-[218px] rounded-[10px] border border-[#e6e6e8] bg-white p-4">
          <SectionTitle title="Needs follow-up" icon={CircleAlert} />
          {followUps.length === 0 ? (
            <div className="mt-3">
              <DashboardEmptyState
                title="All profiles are up to date"
                body="No follow-up is currently required."
              />
            </div>
          ) : (
            <div className="mt-3 divide-y divide-[#f0f0f1]">
              {followUps.map((customer) => (
                <a
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className="flex items-center justify-between gap-3 py-2 text-[11px] transition-colors hover:text-violet-700"
                >
                  <span>
                    <span className="block font-normal leading-tight">{customer.name}</span>
                    <span className="mt-0.5 block text-[10px] leading-tight text-[#96979c]">
                      {stageLabels[customer.stage]}
                    </span>
                  </span>
                  <span className="text-[10px] leading-tight text-[#77787d]">View profile</span>
                </a>
              ))}
            </div>
          )}
        </article>
      </section>

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] xl:items-start">
        <section className="overflow-hidden rounded-[10px] border border-[#e6e6e8] bg-white">
          <div className="flex items-center justify-between border-b border-[#eeeeef] px-4 py-3">
            <div>
              <SectionTitle
                title={range === "day" ? "Today's appointments" : "This week's appointments"}
                icon={CalendarRange}
              />
              <p className="mt-1 text-[18px] font-semibold leading-none tabular-nums">
                {schedule.length}
              </p>
            </div>
            <div className={dashboardToggleGroupClassName} aria-label="Schedule range">
              <button
                type="button"
                onClick={() => setRange("day")}
                className={
                  range === "day"
                    ? dashboardToggleActiveClassName
                    : dashboardToggleInactiveClassName
                }
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setRange("week")}
                className={
                  range === "week"
                    ? dashboardToggleActiveClassName
                    : dashboardToggleInactiveClassName
                }
              >
                Week
              </button>
            </div>
          </div>

          {schedule.length === 0 ? (
            <div className="p-4">
              <DashboardEmptyState
                title="No appointments"
                body="Choose another range or add a new appointment."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead className="bg-[#fcfcfc] text-[10px] text-[#a8a9ae] [&_th]:font-normal">
                  <tr>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-3 py-2.5">Service</th>
                    <th className="px-3 py-2.5">Purpose</th>
                    <th className="px-3 py-2.5">Date and time</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f1]">
                  {schedule.map((appointment) => {
                    const customer = customersById.get(appointment.customerId);
                    return (
                      <tr key={appointment.id} className="transition-colors hover:bg-[#fcfcfd]">
                        <td className="px-4 py-3 text-xs font-normal text-[#333438]">
                          {customer?.name ?? "Unknown customer"}
                        </td>
                        <td className="px-3 py-3 text-xs text-[#76777d]">
                          {bookingTypeLabels[appointment.type]}
                        </td>
                        <td className="px-3 py-3 text-xs text-[#76777d]">{appointment.purpose}</td>
                        <td className="px-3 py-3 text-xs text-[#76777d]" dir="ltr">
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

        <section>
          <article className="rounded-[10px] border border-[#e6e6e8] bg-white p-4">
            <SectionTitle title="Tomorrow's reminders" icon={CalendarRange} />
            {reminders.length === 0 ? (
              <div className="mt-3">
                <DashboardEmptyState
                  title="No reminders scheduled"
                  body="Tomorrow's appointments will appear here."
                />
              </div>
            ) : (
              <div className="mt-3 divide-y divide-[#f0f0f1]">
                {reminders.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="text-xs font-normal">
                        {customersById.get(appointment.customerId)?.name}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-tight text-[#95969b]">
                        {appointment.purpose}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-normal",
                        appointment.reminderStatus === "sent" && "text-emerald-600",
                        appointment.reminderStatus === "scheduled" && "text-violet-600",
                        appointment.reminderStatus === "not-scheduled" && "text-[#95969b]",
                      )}
                    >
                      {reminderStatusLabels[appointment.reminderStatus]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}
