import {
  Bell,
  CalendarDays,
  ChevronDown,
  Clock3,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  appointmentTypes,
  bookingStatuses,
  formatBookingDate,
  type AdminBookingCreateInput,
  type AdminBookingInput,
  type BookingStatus,
  type ScheduleNextAppointmentInput,
} from "@/features/book-call/booking-domain";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus, Customer, ReminderStatus } from "./dashboard-model";
import {
  appointmentStatusLabels,
  bookingTypeLabels,
  reminderStatusLabels,
} from "./dashboard-model";
import { useAdminBookingAvailability } from "./use-admin-booking-availability";
import {
  DashboardEmptyState,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "./dashboard-ui";
import {
  DashboardNextAppointmentDialog,
  type NextAppointmentSubmitResult,
} from "./dashboard-next-appointment-dialog";

export type BookingFilters = {
  query: string;
  status: AppointmentStatus | "all";
  date: string | "all";
  period: "all" | "upcoming" | "past";
};

export type AppointmentFormValues = {
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: "design";
  purpose: string;
  notes: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  reminderStatus: ReminderStatus;
};

export type AppointmentFormErrors = Partial<
  Record<keyof AppointmentFormValues | "overlap", string>
>;

function getCurrentLocalDate(now = new Date()) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function filterAppointments<T extends Appointment>(
  appointments: T[],
  customers: Customer[],
  filters: BookingFilters,
  today = getCurrentLocalDate(),
) {
  const query = filters.query.trim().toLocaleLowerCase();
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  return appointments.filter((appointment) => {
    const customer = customerMap.get(appointment.customerId);
    const appointmentDate = appointment.startsAt.slice(0, 10);
    const matchesQuery =
      !query ||
      [customer?.name, customer?.phone, appointment.purpose, appointment.notes]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(query));
    const matchesPeriod =
      filters.period === "all" ||
      (filters.period === "upcoming" && appointmentDate >= today) ||
      (filters.period === "past" && appointmentDate < today);
    return (
      matchesQuery &&
      (filters.status === "all" || appointment.status === filters.status) &&
      (filters.date === "all" || appointment.startsAt.startsWith(filters.date)) &&
      matchesPeriod
    );
  });
}

export function validateAppointment(
  values: AppointmentFormValues,
  appointments: Appointment[],
  isNewCustomer = false,
) {
  const errors: AppointmentFormErrors = {};
  if (isNewCustomer) {
    if (!values.customerName.trim()) errors.customerName = "Enter the customer name.";
    if (!values.customerPhone.trim()) errors.customerPhone = "Enter the customer phone number.";
  } else if (!values.customerId) {
    errors.customerId = "Select a customer.";
  }
  if (!values.purpose.trim()) errors.purpose = "Enter the appointment purpose.";
  if (!values.date) errors.date = "Select a date.";
  if (!values.time) errors.time = "Select a time.";
  if (Object.keys(errors).length) return errors;

  const startsAt = `${values.date}T${values.time}:00.000Z`;
  const end = new Date(startsAt);
  end.setUTCHours(end.getUTCHours() + 1);
  const overlaps = appointments.some(
    (appointment) =>
      appointment.status !== "cancelled" &&
      new Date(startsAt) < new Date(appointment.endsAt) &&
      end > new Date(appointment.startsAt),
  );
  if (overlaps) errors.overlap = "This time overlaps another appointment.";
  return errors;
}

const emptyForm: AppointmentFormValues = {
  customerId: "",
  customerName: "",
  customerPhone: "",
  type: "design",
  purpose: "",
  notes: "",
  date: "",
  time: "",
  status: "confirmed",
  reminderStatus: "scheduled",
};

const appointmentFieldClassName =
  "mt-1.5 min-h-10 w-full rounded-[10px] border border-[#dedee1] bg-white px-3 text-sm text-[#27272a] outline-none transition-[border-color,box-shadow] placeholder:text-[#b0b0b5] hover:border-[#cacacf] focus:border-[#8b5cf6] focus:ring-4 focus:ring-violet-100/80";

const appointmentLabelClassName = "text-xs font-normal text-[#55565b]";

const tableActionGroupClassName =
  "inline-flex items-center overflow-hidden rounded-lg border border-[#e8e8ec] bg-white shadow-[0_1px_2px_rgba(24,24,27,0.03)]";

const tableActionButtonClassName =
  "inline-flex size-7 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400 disabled:cursor-wait disabled:opacity-60";

const tableActionDividerClassName = "h-4 w-px shrink-0 bg-[#ececef]";

type GeneralAppointment = Appointment & { type: "design" };

function StatusSelect({
  appointment,
  updating,
  onStatusChange,
}: {
  appointment: GeneralAppointment;
  updating: boolean;
  onStatusChange: (id: string, status: BookingStatus) => void;
}) {
  return (
    <select
      aria-label={`Status for ${appointment.purpose}`}
      value={appointment.status}
      disabled={updating}
      onChange={(event) => onStatusChange(appointment.id, event.target.value as BookingStatus)}
      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 disabled:cursor-wait disabled:opacity-60"
    >
      {bookingStatuses.map((status) => (
        <option key={status} value={status}>
          {appointmentStatusLabels[status]}
        </option>
      ))}
    </select>
  );
}

export function getReminderHref(
  appointment: Pick<Appointment, "purpose" | "startsAt">,
  customer: Pick<Customer, "name" | "phone"> | undefined,
) {
  const message = `Hi ${customer?.name ?? "there"}, this is a reminder for your ${appointment.purpose} appointment on ${appointment.startsAt.slice(0, 10)} at ${appointment.startsAt.slice(11, 16)}.`;
  return `https://wa.me/${customer?.phone.replace(/\D/g, "") ?? ""}?text=${encodeURIComponent(message)}`;
}

function ReminderAction({
  appointment,
  customer,
  updating,
  onReminderSent,
  presentation = "text",
}: {
  appointment: GeneralAppointment;
  customer: Customer | undefined;
  updating: boolean;
  onReminderSent: (id: string) => void | Promise<void>;
  presentation?: "text" | "icon";
}) {
  if (presentation === "icon") {
    const customerName = customer?.name ?? "customer";
    const reminderLabel = `Reminder ${reminderStatusLabels[appointment.reminderStatus]} for ${customerName}`;

    if (appointment.reminderStatus !== "not-scheduled" || updating) {
      return (
        <button
          type="button"
          disabled
          aria-label={updating ? `Sending reminder to ${customerName}` : reminderLabel}
          title={updating ? "Sending reminder" : reminderStatusLabels[appointment.reminderStatus]}
          className={cn(tableActionButtonClassName, "text-slate-400")}
        >
          <Bell className="size-3.5" aria-hidden="true" />
        </button>
      );
    }

    return (
      <a
        href={getReminderHref(appointment, customer)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Send reminder to ${customerName}`}
        title="Send reminder"
        onClick={() => void onReminderSent(appointment.id)}
        className={cn(tableActionButtonClassName, "text-yellow-600 hover:bg-yellow-50")}
      >
        <Bell className="size-3.5" aria-hidden="true" />
      </a>
    );
  }

  if (appointment.reminderStatus === "sent") {
    return <span className="text-[10px] text-emerald-700">Reminder sent</span>;
  }
  if (appointment.reminderStatus === "scheduled") {
    return <span className="text-[10px] text-slate-500">{reminderStatusLabels.scheduled}</span>;
  }

  return (
    <a
      href={getReminderHref(appointment, customer)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Send reminder to ${customer?.name ?? "customer"}`}
      aria-disabled={updating}
      onClick={() => void onReminderSent(appointment.id)}
      className="inline-flex min-h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 aria-disabled:pointer-events-none aria-disabled:cursor-wait aria-disabled:opacity-60"
    >
      Send Reminder
    </a>
  );
}

export function DashboardBookings({
  customers,
  appointments,
  newBookingIds = new Set<string>(),
  openNewOnMount = false,
  onStatusChange = () => undefined,
  updatingId = null,
  updateError = "",
  onDelete = () => undefined,
  deletingId = null,
  deleteError = "",
  onReminderSent = () => undefined,
  reminderUpdatingId = null,
  reminderError = "",
  onScheduleNext = async () => ({ success: false, reason: "storage-error" as const }),
  onCreate = async () => ({ success: false, reason: "storage-error" as const }),
  onUpdate = async () => ({ success: false, reason: "storage-error" as const }),
}: {
  customers: Customer[];
  appointments: Appointment[];
  newBookingIds?: ReadonlySet<string>;
  openNewOnMount?: boolean;
  onStatusChange?: (id: string, status: BookingStatus) => void;
  updatingId?: string | null;
  updateError?: string;
  onDelete?: (id: string) => void | Promise<void>;
  deletingId?: string | null;
  deleteError?: string;
  onReminderSent?: (id: string) => void | Promise<void>;
  reminderUpdatingId?: string | null;
  reminderError?: string;
  onScheduleNext?: (input: ScheduleNextAppointmentInput) => Promise<NextAppointmentSubmitResult>;
  onCreate?: (input: AdminBookingCreateInput) => Promise<{ success: boolean; reason?: string }>;
  onUpdate?: (
    id: string,
    input: AdminBookingInput,
  ) => Promise<{ success: boolean; reason?: string }>;
}) {
  const [filters, setFilters] = useState<BookingFilters>({
    query: "",
    status: "all",
    date: "all",
    period: "all",
  });
  const [open, setOpen] = useState(openNewOnMount);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AppointmentFormValues>(emptyForm);
  const [errors, setErrors] = useState<AppointmentFormErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingAppointment, setDeletingAppointment] = useState<GeneralAppointment | null>(null);
  const [notePreview, setNotePreview] = useState<GeneralAppointment | null>(null);
  const [nextAppointment, setNextAppointment] = useState<GeneralAppointment | null>(null);
  const generalAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment): appointment is GeneralAppointment => appointment.type === "design",
      ),
    [appointments],
  );
  const visibleAppointments = useMemo(
    () =>
      filterAppointments(generalAppointments, customers, filters).sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt),
      ),
    [customers, filters, generalAppointments],
  );
  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );
  const selectedCustomer = customersById.get(form.customerId);
  const appointmentPurposeOptions = useMemo(() => {
    if (!editingId) return [...appointmentTypes];
    const currentPurpose = generalAppointments.find(
      (appointment) => appointment.id === editingId,
    )?.purpose;
    return currentPurpose &&
      !appointmentTypes.includes(currentPurpose as (typeof appointmentTypes)[number])
      ? [currentPurpose, ...appointmentTypes]
      : [...appointmentTypes];
  }, [editingId, generalAppointments]);
  const availability = useAdminBookingAvailability();

  async function loadAvailability(date: string, excludeAppointmentId?: string) {
    const month = new Date(`${date}T00:00:00`);
    await availability.loadMonth(month, excludeAppointmentId);
    await availability.loadDate(date, excludeAppointmentId);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    availability.clear();
    setOpen(true);
    void availability.loadMonth(new Date());
  }

  function openEdit(appointment: GeneralAppointment) {
    setEditingId(appointment.id);
    setForm({
      customerId: appointment.customerId,
      customerName: customersById.get(appointment.customerId)?.name ?? "",
      customerPhone: customersById.get(appointment.customerId)?.phone ?? "",
      type: appointment.type,
      purpose: appointment.purpose,
      notes: appointment.notes ?? "",
      date: appointment.startsAt.slice(0, 10),
      time: appointment.startsAt.slice(11, 16),
      status: appointment.status,
      reminderStatus: appointment.reminderStatus,
    });
    setErrors({});
    setOpen(true);
    void loadAvailability(appointment.startsAt.slice(0, 10), appointment.id);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAppointment(form, [], !editingId);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    if (!availability.slots.some((slot) => slot.startsAt === form.time)) {
      setErrors({ time: "Choose an available time." });
      return;
    }
    setSubmitting(true);
    const appointmentInput = {
      appointmentType: form.purpose as AdminBookingInput["appointmentType"],
      appointmentDate: form.date,
      appointmentTime: form.time,
      notes: form.notes.trim(),
      status: form.status,
      reminderStatus: form.reminderStatus,
    };
    try {
      const result = editingId
        ? await onUpdate(editingId, { ...appointmentInput, customerId: form.customerId })
        : await onCreate({
            ...appointmentInput,
            fullName: form.customerName.trim(),
            mobile: form.customerPhone.trim(),
          });
      if (!result.success) {
        setErrors({ overlap: "That time is no longer available. Choose another available time." });
        await availability.loadDate(form.date, editingId ?? undefined);
        return;
      }
      const message = editingId ? "Appointment updated." : "Appointment added.";
      setStatusMessage(message);
      toast.success(message);
      setOpen(false);
      availability.clear();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 lg:flex lg:items-end">
        <label className="relative col-span-2 block min-w-0 text-xs font-normal text-slate-600 lg:flex-1">
          Search bookings
          <Search
            className="pointer-events-none absolute bottom-3 left-3 size-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            aria-label="Search bookings"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 pl-9 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </label>
        <label className="min-w-0 text-xs font-normal text-slate-600">
          Status
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value as BookingFilters["status"] })
            }
            className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm lg:w-auto"
          >
            <option value="all">All</option>
            <option value="pending">Pending confirmation</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="min-w-0 text-xs font-normal text-slate-600">
          Period
          <select
            aria-label="Period"
            value={filters.period}
            onChange={(event) =>
              setFilters({ ...filters, period: event.target.value as BookingFilters["period"] })
            }
            className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm lg:w-auto"
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </label>
        <label className="col-span-2 min-w-0 text-xs font-normal text-slate-600">
          Date
          <input
            type="date"
            value={filters.date === "all" ? "" : filters.date}
            onChange={(event) => setFilters({ ...filters, date: event.target.value || "all" })}
            className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm lg:w-auto"
          />
        </label>
        <button
          type="button"
          onClick={openCreate}
          className={cn(
            dashboardPrimaryButtonClassName,
            "col-span-2 min-h-10 w-full justify-center gap-1.5 px-3 text-xs font-normal lg:min-h-9 lg:w-auto",
          )}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          New appointment
        </button>
      </div>
      <p className="sr-only" role="status">
        {statusMessage}
      </p>
      {updateError && (
        <p role="alert" className="text-sm text-rose-600">
          {updateError}
        </p>
      )}
      {deleteError && (
        <p role="alert" className="text-sm text-rose-600">
          {deleteError}
        </p>
      )}
      {reminderError && (
        <p role="alert" className="text-sm text-rose-600">
          {reminderError}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {visibleAppointments.length === 0 ? (
          <div className="p-4">
            <DashboardEmptyState title="No bookings" body="Try changing the search or filters." />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] text-slate-500 [&_th]:font-normal">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th>Phone</th>
                    <th>Purpose</th>
                    <th>Notes</th>
                    <th>Appointment</th>
                    <th>Status</th>
                    <th className="px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="px-4 py-3 font-normal">
                        <a
                          href={`/dashboard/customers/${appointment.customerId}`}
                          className="text-[#333438] transition-colors hover:text-[#161619] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                        >
                          {customersById.get(appointment.customerId)?.name}
                        </a>
                        {newBookingIds.has(appointment.id) && (
                          <span
                            aria-label="New booking"
                            className="ml-2 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-normal text-violet-700"
                          >
                            New booking
                          </span>
                        )}
                      </td>
                      <td className="text-slate-500" dir="ltr">
                        {customersById.get(appointment.customerId)?.phone}
                      </td>
                      <td className="text-slate-500">{appointment.purpose}</td>
                      <td className="max-w-48 text-slate-500">
                        {appointment.notes ? (
                          <div className="flex items-center gap-1">
                            <span className="truncate" title={appointment.notes}>
                              {appointment.notes.length > 44
                                ? `${appointment.notes.slice(0, 44)}…`
                                : appointment.notes}
                            </span>
                            {appointment.notes.length > 44 && (
                              <button
                                type="button"
                                aria-label={`View notes for ${appointment.purpose}`}
                                title="View full notes"
                                onClick={() => setNotePreview(appointment)}
                                className="inline-flex size-6 shrink-0 items-center justify-center rounded text-violet-600 transition-colors hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                              >
                                <ChevronDown className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-slate-500" dir="ltr">
                        {appointment.startsAt.slice(0, 10)} · {appointment.startsAt.slice(11, 16)}
                      </td>
                      <td>
                        <StatusSelect
                          appointment={appointment}
                          updating={updatingId === appointment.id}
                          onStatusChange={onStatusChange}
                        />
                      </td>
                      <td className="px-4">
                        <div className={tableActionGroupClassName}>
                          <ReminderAction
                            presentation="icon"
                            appointment={appointment}
                            customer={customersById.get(appointment.customerId)}
                            updating={reminderUpdatingId === appointment.id}
                            onReminderSent={onReminderSent}
                          />
                          <span className={tableActionDividerClassName} aria-hidden="true" />
                          <a
                            href={`https://wa.me/${customersById.get(appointment.customerId)?.phone.replace(/\D/g, "") ?? ""}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Message ${customersById.get(appointment.customerId)?.name ?? "customer"} on WhatsApp`}
                            title="Message on WhatsApp"
                            className={cn(
                              tableActionButtonClassName,
                              "text-emerald-600 hover:bg-emerald-50",
                            )}
                          >
                            <MessageCircle className="size-3.5" />
                          </a>
                          <span className={tableActionDividerClassName} aria-hidden="true" />
                          {appointment.status !== "cancelled" && (
                            <>
                              <button
                                type="button"
                                aria-label={`Schedule next appointment for ${customersById.get(appointment.customerId)?.name ?? "customer"}`}
                                title="Schedule next appointment"
                                onClick={() => setNextAppointment(appointment)}
                                className={cn(
                                  tableActionButtonClassName,
                                  "text-sky-600 hover:bg-sky-50",
                                )}
                              >
                                <Plus className="size-3.5" />
                              </button>
                              <span className={tableActionDividerClassName} aria-hidden="true" />
                            </>
                          )}
                          <button
                            type="button"
                            aria-label={`Edit ${appointment.purpose}`}
                            title="Edit appointment"
                            onClick={() => openEdit(appointment)}
                            className={cn(
                              tableActionButtonClassName,
                              "text-violet-600 hover:bg-violet-50",
                            )}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <span className={tableActionDividerClassName} aria-hidden="true" />
                          <button
                            type="button"
                            aria-label={`Delete ${appointment.purpose}`}
                            title="Delete booking"
                            disabled={
                              updatingId === appointment.id || deletingId === appointment.id
                            }
                            onClick={() => setDeletingAppointment(appointment)}
                            className={cn(
                              tableActionButtonClassName,
                              "text-rose-600 hover:bg-rose-50",
                            )}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {visibleAppointments.map((appointment) => (
                <article key={appointment.id} className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {customersById.get(appointment.customerId)?.name}
                      {newBookingIds.has(appointment.id) && (
                        <span
                          aria-label="New booking"
                          className="ml-2 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-normal text-violet-700"
                        >
                          New booking
                        </span>
                      )}
                    </p>
                    <StatusSelect
                      appointment={appointment}
                      updating={updatingId === appointment.id}
                      onStatusChange={onStatusChange}
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    {appointment.purpose} · {bookingTypeLabels[appointment.type]}
                  </p>
                  {appointment.notes &&
                    (appointment.notes.length > 44 ? (
                      <button
                        type="button"
                        onClick={() => setNotePreview(appointment)}
                        className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline"
                      >
                        View notes
                        <ChevronDown className="size-3.5" />
                      </button>
                    ) : (
                      <p className="text-xs text-slate-500">{appointment.notes}</p>
                    ))}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span dir="ltr">
                      {appointment.startsAt.slice(0, 10)} · {appointment.startsAt.slice(11, 16)}
                    </span>
                    <div className={tableActionGroupClassName}>
                      <ReminderAction
                        presentation="icon"
                        appointment={appointment}
                        customer={customersById.get(appointment.customerId)}
                        updating={reminderUpdatingId === appointment.id}
                        onReminderSent={onReminderSent}
                      />
                      <span className={tableActionDividerClassName} aria-hidden="true" />
                      <a
                        href={`https://wa.me/${customersById.get(appointment.customerId)?.phone.replace(/\D/g, "") ?? ""}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Message ${customersById.get(appointment.customerId)?.name ?? "customer"} on WhatsApp`}
                        title="Message on WhatsApp"
                        className={cn(
                          tableActionButtonClassName,
                          "text-emerald-600 hover:bg-emerald-50",
                        )}
                      >
                        <MessageCircle className="size-3.5" />
                      </a>
                      <span className={tableActionDividerClassName} aria-hidden="true" />
                      {appointment.status !== "cancelled" && (
                        <>
                          <button
                            type="button"
                            aria-label={`Schedule next appointment for ${customersById.get(appointment.customerId)?.name ?? "customer"}`}
                            title="Schedule next appointment"
                            onClick={() => setNextAppointment(appointment)}
                            className={cn(
                              tableActionButtonClassName,
                              "text-sky-600 hover:bg-sky-50",
                            )}
                          >
                            <Plus className="size-3.5" />
                          </button>
                          <span className={tableActionDividerClassName} aria-hidden="true" />
                        </>
                      )}
                      <button
                        type="button"
                        aria-label={`Edit ${appointment.purpose}`}
                        title="Edit appointment"
                        onClick={() => openEdit(appointment)}
                        className={cn(
                          tableActionButtonClassName,
                          "text-violet-600 hover:bg-violet-50",
                        )}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <span className={tableActionDividerClassName} aria-hidden="true" />
                      <button
                        type="button"
                        aria-label={`Delete ${appointment.purpose}`}
                        title="Delete booking"
                        disabled={updatingId === appointment.id || deletingId === appointment.id}
                        onClick={() => setDeletingAppointment(appointment)}
                        className={cn(tableActionButtonClassName, "text-rose-600 hover:bg-rose-50")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {nextAppointment && customersById.get(nextAppointment.customerId) && (
        <DashboardNextAppointmentDialog
          open
          currentAppointment={nextAppointment}
          customer={customersById.get(nextAppointment.customerId)!}
          appointments={appointments}
          onClose={() => setNextAppointment(null)}
          onSubmit={onScheduleNext}
        />
      )}

      <AlertDialog
        open={Boolean(deletingAppointment)}
        onOpenChange={(open) => {
          if (!open) setDeletingAppointment(null);
        }}
      >
        <AlertDialogContent dir="ltr" className="max-w-md bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the booking for {deletingAppointment?.purpose}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingAppointment) void onDelete(deletingAppointment.id);
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              Delete booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(notePreview)}
        onOpenChange={(isOpen) => !isOpen && setNotePreview(null)}
      >
        <DialogContent dir="ltr" className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">Booking notes</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {notePreview?.notes}
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          dir="ltr"
          className="max-h-[92dvh] gap-0 overflow-y-auto border-[#dedee1] bg-white p-0 shadow-[0_28px_80px_rgba(24,24,27,0.24)] sm:max-w-[780px] sm:rounded-[18px]"
        >
          <DialogHeader className="border-b border-[#ececef] px-5 py-4 pr-14 text-left sm:px-7 sm:py-5">
            <CalendarDays className="mb-2 size-4 text-[#6d3fd1]" aria-hidden="true" />
            <DialogTitle className="text-xl font-medium tracking-[-0.025em] text-[#202024]">
              {editingId ? "Edit appointment" : "New appointment"}
            </DialogTitle>
            <DialogDescription className="max-w-lg text-xs leading-4 text-[#85868c]">
              {editingId
                ? "Update the customer, appointment details, schedule, and booking state."
                : "Add the details the team needs to prepare for this appointment."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit}>
            <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
              <section className="space-y-4 px-5 py-4 sm:px-7">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <UserRound className="size-4 text-[#8e8f95]" aria-hidden="true" />
                    <h3 className="text-sm font-medium text-[#303035]">Customer and visit</h3>
                  </div>

                  {editingId ? (
                    <>
                      <label className={appointmentLabelClassName}>
                        Customer
                        <select
                          aria-invalid={Boolean(errors.customerId)}
                          value={form.customerId}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, customerId: event.target.value }))
                          }
                          className={appointmentFieldClassName}
                        >
                          <option value="">Select a customer</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} — {customer.phone}
                            </option>
                          ))}
                        </select>
                      </label>
                      {errors.customerId && (
                        <p role="alert" className="mt-1.5 text-xs text-rose-600">
                          {errors.customerId}
                        </p>
                      )}
                      {selectedCustomer && (
                        <p className="mt-1.5 text-xs text-[#929399]">
                          WhatsApp contact · {selectedCustomer.phone}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={appointmentLabelClassName}>
                          Customer name
                          <input
                            aria-invalid={Boolean(errors.customerName)}
                            value={form.customerName}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                customerName: event.target.value,
                              }))
                            }
                            className={appointmentFieldClassName}
                          />
                        </label>
                        {errors.customerName && (
                          <p role="alert" className="mt-1.5 text-xs text-rose-600">
                            {errors.customerName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={appointmentLabelClassName}>
                          Phone number
                          <input
                            type="tel"
                            dir="ltr"
                            aria-invalid={Boolean(errors.customerPhone)}
                            value={form.customerPhone}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                customerPhone: event.target.value,
                              }))
                            }
                            className={appointmentFieldClassName}
                          />
                        </label>
                        {errors.customerPhone && (
                          <p role="alert" className="mt-1.5 text-xs text-rose-600">
                            {errors.customerPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={appointmentLabelClassName}>
                    Appointment purpose
                    <select
                      aria-invalid={Boolean(errors.purpose)}
                      value={form.purpose}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, purpose: event.target.value }))
                      }
                      className={appointmentFieldClassName}
                    >
                      <option value="">Select an appointment purpose</option>
                      {appointmentPurposeOptions.map((purpose) => (
                        <option key={purpose} value={purpose}>
                          {purpose}
                        </option>
                      ))}
                    </select>
                  </label>
                  {errors.purpose && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-600">
                      {errors.purpose}
                    </p>
                  )}
                </div>

                <div>
                  <label className={appointmentLabelClassName}>
                    Notes <span className="font-normal text-[#a0a1a6]">(optional)</span>
                    <textarea
                      value={form.notes}
                      placeholder="Measurements, references, items to prepare, or any customer requests"
                      rows={4}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      className={cn(appointmentFieldClassName, "min-h-24 resize-y py-2 leading-5")}
                    />
                  </label>
                  <p className="mt-1 text-[11px] leading-4 text-[#a0a1a6]">
                    These notes appear in the bookings list for quick reference.
                  </p>
                </div>
              </section>

              <aside className="border-t border-[#ececef] bg-[#fafafa] px-5 py-4 sm:px-7 lg:border-l lg:border-t-0">
                <div className="mb-3 flex items-center gap-2">
                  <Clock3 className="size-4 text-[#8e8f95]" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-[#303035]">Schedule and status</h3>
                </div>

                <div className="grid gap-3">
                  <div>
                    <span className={appointmentLabelClassName}>Available date</span>
                    <Calendar
                      mode="single"
                      selected={form.date ? new Date(`${form.date}T00:00:00`) : undefined}
                      month={form.date ? new Date(`${form.date}T00:00:00`) : undefined}
                      onMonthChange={(month) =>
                        void availability.loadMonth(month, editingId ?? undefined)
                      }
                      disabled={(date) => !availability.openDates.includes(formatBookingDate(date))}
                      onSelect={(date) => {
                        if (!date) return;
                        const nextDate = formatBookingDate(date);
                        setForm((current) => ({ ...current, date: nextDate, time: "" }));
                        setErrors((current) => ({ ...current, date: undefined, time: undefined }));
                        void availability.loadDate(nextDate, editingId ?? undefined);
                      }}
                      className="mt-1 rounded-lg border border-[#dedee1] bg-white p-1"
                    />
                    {availability.monthLoading && (
                      <p className="mt-1 text-xs text-slate-500">Loading dates…</p>
                    )}
                    {errors.date && (
                      <p role="alert" className="mt-1.5 text-xs text-rose-600">
                        {errors.date}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className={appointmentLabelClassName}>Available time</span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {availability.slots.map((slot) => {
                        const time = slot.startsAt;
                        return (
                          <button
                            key={slot.startsAt}
                            type="button"
                            aria-pressed={form.time === time}
                            onClick={() => setForm((current) => ({ ...current, time }))}
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-xs tabular-nums transition-colors",
                              form.time === time
                                ? "border-violet-600 bg-violet-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-violet-300",
                            )}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                    {availability.slotsLoading && (
                      <p className="mt-1 text-xs text-slate-500">Loading times…</p>
                    )}
                    {!availability.slotsLoading && form.date && availability.slots.length === 0 && (
                      <p className="mt-1 text-xs text-slate-500">Choose another available date.</p>
                    )}
                    {errors.time && (
                      <p role="alert" className="mt-1.5 text-xs text-rose-600">
                        {errors.time}
                      </p>
                    )}
                  </div>

                  <label className={appointmentLabelClassName}>
                    Booking status
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as AppointmentStatus,
                        }))
                      }
                      className={appointmentFieldClassName}
                    >
                      {bookingStatuses.map((status) => (
                        <option key={status} value={status}>
                          {appointmentStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {errors.overlap && (
                  <p
                    role="alert"
                    className="mt-4 rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700"
                  >
                    {errors.overlap}
                  </p>
                )}
                {availability.error && (
                  <div className="mt-4 rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                    <p>{availability.error}</p>
                    <button
                      type="button"
                      onClick={() =>
                        void (form.date
                          ? loadAvailability(form.date, editingId ?? undefined)
                          : availability.loadMonth(new Date(), editingId ?? undefined))
                      }
                      className="mt-1 underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </aside>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#e7e7e9] bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  availability.clear();
                }}
                className={cn(
                  dashboardSecondaryButtonClassName,
                  "min-h-9 px-4 text-xs font-normal",
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || availability.slotsLoading}
                className={cn(dashboardPrimaryButtonClassName, "min-h-9 px-5 text-xs font-normal")}
              >
                {submitting ? "Saving…" : editingId ? "Save changes" : "Add appointment"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
