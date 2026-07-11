import { Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState, type Dispatch } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus, BookingType, Customer } from "./dashboard-model";
import { bookingTypeLabels, reminderStatusLabels } from "./dashboard-model";
import type { DashboardAction } from "./dashboard-store";
import { DashboardEmptyState, StatusBadge, dashboardIconButtonClassName, dashboardPrimaryButtonClassName, dashboardSecondaryButtonClassName } from "./dashboard-ui";

export type BookingFilters = {
  query: string;
  type: BookingType | "all";
  status: AppointmentStatus | "all";
  date: string | "all";
};

export type AppointmentFormValues = {
  customerId: string;
  type: BookingType;
  purpose: string;
  date: string;
  time: string;
};

export type AppointmentFormErrors = Partial<
  Record<keyof AppointmentFormValues | "overlap", string>
>;

export function filterAppointments(
  appointments: Appointment[],
  customers: Customer[],
  filters: BookingFilters,
) {
  const query = filters.query.trim().toLocaleLowerCase();
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  return appointments.filter((appointment) => {
    const customer = customerMap.get(appointment.customerId);
    const matchesQuery =
      !query ||
      [customer?.name, customer?.phone, appointment.purpose]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(query));
    return (
      matchesQuery &&
      (filters.type === "all" || appointment.type === filters.type) &&
      (filters.status === "all" || appointment.status === filters.status) &&
      (filters.date === "all" || appointment.startsAt.startsWith(filters.date))
    );
  });
}

export function validateAppointment(values: AppointmentFormValues, appointments: Appointment[]) {
  const errors: AppointmentFormErrors = {};
  if (!values.customerId) errors.customerId = "Select a customer.";
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
  type: "design",
  purpose: "",
  date: "",
  time: "",
};

export function DashboardBookings({
  customers,
  appointments,
  dispatch,
  openNewOnMount = false,
}: {
  customers: Customer[];
  appointments: Appointment[];
  dispatch: Dispatch<DashboardAction>;
  openNewOnMount?: boolean;
}) {
  const [filters, setFilters] = useState<BookingFilters>({
    query: "",
    type: "all",
    status: "all",
    date: "all",
  });
  const [open, setOpen] = useState(openNewOnMount);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AppointmentFormValues>(emptyForm);
  const [errors, setErrors] = useState<AppointmentFormErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const visibleAppointments = useMemo(
    () =>
      filterAppointments(appointments, customers, filters).sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt),
      ),
    [appointments, customers, filters],
  );
  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  }

  function openEdit(appointment: Appointment) {
    setEditingId(appointment.id);
    setForm({
      customerId: appointment.customerId,
      type: appointment.type,
      purpose: appointment.purpose,
      date: appointment.startsAt.slice(0, 10),
      time: appointment.startsAt.slice(11, 16),
    });
    setErrors({});
    setOpen(true);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAppointment(
      form,
      appointments.filter((item) => item.id !== editingId),
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const startsAt = `${form.date}T${form.time}:00.000Z`;
    const end = new Date(startsAt);
    end.setUTCHours(end.getUTCHours() + 1);
    const appointment: Appointment = {
      id: editingId ?? `appointment-${Date.now()}`,
      customerId: form.customerId,
      type: form.type,
      purpose: form.purpose.trim(),
      startsAt,
      endsAt: end.toISOString(),
      status: editingId
        ? (appointments.find((item) => item.id === editingId)?.status ?? "confirmed")
        : "confirmed",
      reminderStatus: editingId
        ? (appointments.find((item) => item.id === editingId)?.reminderStatus ?? "scheduled")
        : "scheduled",
    };
    dispatch({ type: editingId ? "appointment/update" : "appointment/add", appointment });
    const message = editingId ? "Appointment updated." : "Appointment added.";
    setStatusMessage(message);
    toast.success(message);
    setOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-end">
        <label className="relative block flex-1 text-xs font-medium text-slate-600">
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
        <label className="text-xs font-medium text-slate-600">
          Type
          <select
            value={filters.type}
            onChange={(event) =>
              setFilters({ ...filters, type: event.target.value as BookingFilters["type"] })
            }
            className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="workshop">Workshop</option>
            <option value="design">Design</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Status
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value as BookingFilters["status"] })
            }
            className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending confirmation</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Date
          <input
            type="date"
            value={filters.date === "all" ? "" : filters.date}
            onChange={(event) => setFilters({ ...filters, date: event.target.value || "all" })}
            className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={openCreate}
          className={cn(dashboardPrimaryButtonClassName, "min-h-10 gap-2 px-4 text-sm")}
        >
          <Plus className="size-4" aria-hidden="true" />
          New appointment
        </button>
      </div>
      <p className="sr-only" role="status">
        {statusMessage}
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {visibleAppointments.length === 0 ? (
          <div className="p-4">
            <DashboardEmptyState title="No bookings" body="Try changing the search or filters." />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Appointment</th>
                    <th>Status</th>
                    <th>Reminder</th>
                    <th className="px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="px-4 py-3 font-medium">
                        {customersById.get(appointment.customerId)?.name}
                      </td>
                      <td>{bookingTypeLabels[appointment.type]}</td>
                      <td>{appointment.purpose}</td>
                      <td dir="ltr">
                        {appointment.startsAt.slice(0, 10)} · {appointment.startsAt.slice(11, 16)}
                      </td>
                      <td>
                        <StatusBadge status={appointment.status} />
                      </td>
                      <td className="text-xs text-slate-500">
                        {reminderStatusLabels[appointment.reminderStatus]}
                      </td>
                      <td className="px-4">
                        <button
                          type="button"
                          aria-label={`Edit ${appointment.purpose}`}
                          onClick={() => openEdit(appointment)}
                          className={cn(dashboardIconButtonClassName, "p-2 text-slate-500 hover:text-violet-700")}
                        >
                          <Pencil className="size-4" />
                        </button>
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
                    <p className="font-medium">{customersById.get(appointment.customerId)?.name}</p>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <p className="text-sm text-slate-600">
                    {appointment.purpose} · {bookingTypeLabels[appointment.type]}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span dir="ltr">
                      {appointment.startsAt.slice(0, 10)} · {appointment.startsAt.slice(11, 16)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(appointment)}
                      className={cn(dashboardSecondaryButtonClassName, "min-h-10 px-3 text-xs text-violet-700")}
                    >
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="ltr" className="max-w-xl bg-white">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit appointment" : "New appointment"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <label className="text-sm">
              Customer
              <select
                value={form.customerId}
                onChange={(event) => setForm({ ...form, customerId: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <span className="mt-1 block text-xs text-rose-600">{errors.customerId}</span>
              )}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Type
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value as BookingType })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                >
                  <option value="design">Design</option>
                  <option value="workshop">Workshop</option>
                </select>
              </label>
              <label className="text-sm">
                Appointment purpose
                <input
                  value={form.purpose}
                  onChange={(event) => setForm({ ...form, purpose: event.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                />
                {errors.purpose && (
                  <span className="mt-1 block text-xs text-rose-600">{errors.purpose}</span>
                )}
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                />
                {errors.date && (
                  <span className="mt-1 block text-xs text-rose-600">{errors.date}</span>
                )}
              </label>
              <label className="text-sm">
                Time
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm({ ...form, time: event.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                />
                {errors.time && (
                  <span className="mt-1 block text-xs text-rose-600">{errors.time}</span>
                )}
              </label>
            </div>
            {errors.overlap && <p className="text-sm text-rose-600">{errors.overlap}</p>}
            <button
              type="submit"
              className={cn(dashboardPrimaryButtonClassName, "min-h-10 px-4 text-sm")}
            >
              {editingId ? "Save changes" : "Add appointment"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
