import { useEffect, useState } from "react";
import {
  formatBookingDate,
  nextAppointmentTypes,
  reminderStatuses,
  type AppointmentType,
  type BookingReminderStatus,
  type ScheduleNextAppointmentInput,
} from "@/features/book-call/booking-domain";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  appointmentsOverlap,
  reminderStatusLabels,
  type Appointment,
  type Customer,
} from "./dashboard-model";
import { dashboardPrimaryButtonClassName, dashboardSecondaryButtonClassName } from "./dashboard-ui";
import { useAdminBookingAvailability } from "./use-admin-booking-availability";

export type NextAppointmentSubmitResult =
  | { success: true }
  | {
      success: false;
      reason:
        | "forbidden"
        | "validation"
        | "not-found"
        | "cancelled"
        | "slot-unavailable"
        | "storage-error";
      fieldErrors?: Record<string, string | undefined>;
    };

const submitMessages = {
  forbidden: "Please sign in again before scheduling the next appointment.",
  validation: "Check the appointment details and try again.",
  "not-found": "The current appointment no longer exists.",
  cancelled: "A cancelled appointment cannot schedule a next appointment.",
  "slot-unavailable": "This time already has an appointment.",
  "storage-error": "Could not schedule the next appointment. Please try again.",
} as const;

type FormState = {
  appointmentType: "" | AppointmentType;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  reminderStatus: BookingReminderStatus;
};

const emptyForm: FormState = {
  appointmentType: "",
  appointmentDate: "",
  appointmentTime: "",
  notes: "",
  reminderStatus: "scheduled",
};

export function DashboardNextAppointmentDialog({
  open,
  currentAppointment,
  customer,
  appointments,
  onClose,
  onSubmit,
}: {
  open: boolean;
  currentAppointment: Appointment;
  customer: Customer;
  appointments: Appointment[];
  onClose: () => void;
  onSubmit: (input: ScheduleNextAppointmentInput) => Promise<NextAppointmentSubmitResult>;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const {
    openDates,
    slots,
    monthLoading,
    slotsLoading,
    error: availabilityError,
    loadMonth,
    loadDate,
    clear: clearAvailability,
  } = useAdminBookingAvailability();

  useEffect(() => {
    setForm(emptyForm);
    setMessage("");
    setSubmitting(false);
    if (open) void loadMonth(new Date());
    return () => clearAvailability();
  }, [clearAvailability, currentAppointment.id, loadMonth, open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!form.appointmentType || !form.appointmentDate || !form.appointmentTime) {
      setMessage("Choose an appointment purpose, date, and time.");
      return;
    }

    const startsAt = `${form.appointmentDate}T${form.appointmentTime}:00.000Z`;
    const endsAt = new Date(startsAt);
    endsAt.setUTCHours(endsAt.getUTCHours() + 1);
    if (
      appointments.some(
        (appointment) =>
          appointment.id !== currentAppointment.id &&
          appointment.status !== "cancelled" &&
          appointmentsOverlap(appointment, startsAt, endsAt.toISOString()),
      )
    ) {
      setMessage("This time already has an appointment.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const result = await onSubmit({
        currentAppointmentId: currentAppointment.id,
        appointmentType: form.appointmentType,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        notes: form.notes,
        reminderStatus: form.reminderStatus,
      });
      if (result.success) {
        onClose();
        return;
      }
      setMessage(result.fieldErrors?.appointmentDate ?? submitMessages[result.reason]);
      if (result.reason === "slot-unavailable") {
        setForm((current) => ({ ...current, appointmentTime: "" }));
        void loadDate(form.appointmentDate);
      }
    } catch {
      setMessage(submitMessages["storage-error"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent dir="ltr" className="max-h-[90vh] max-w-3xl overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="font-medium">Next appointment</DialogTitle>
          <DialogDescription>Schedule the next visit for this customer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium">{customer.name}</p>
            <p className="mt-1 text-xs text-slate-600">
              Current: {currentAppointment.purpose} · {currentAppointment.startsAt.slice(0, 10)} ·{" "}
              {currentAppointment.startsAt.slice(11, 16)}
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="grid content-start gap-4">
              <label className="text-sm">
                Appointment purpose
                <select
                  value={form.appointmentType}
                  disabled={submitting}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      appointmentType: event.target.value as FormState["appointmentType"],
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                >
                  <option value="">Select an appointment purpose</option>
                  {nextAppointmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Notes
                <textarea
                  value={form.notes}
                  disabled={submitting}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Reminder
                <select
                  value={form.reminderStatus}
                  disabled={submitting}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reminderStatus: event.target.value as BookingReminderStatus,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                >
                  {reminderStatuses.map((status) => (
                    <option key={status} value={status}>
                      {reminderStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-800">Available date</p>
              <Calendar
                mode="single"
                selected={
                  form.appointmentDate ? new Date(`${form.appointmentDate}T00:00:00`) : undefined
                }
                onMonthChange={(month) => void loadMonth(month)}
                disabled={(date) => !openDates.includes(formatBookingDate(date))}
                onSelect={(date) => {
                  if (!date) return;
                  const appointmentDate = formatBookingDate(date);
                  setForm((current) => ({
                    ...current,
                    appointmentDate,
                    appointmentTime: "",
                  }));
                  setMessage("");
                  void loadDate(appointmentDate);
                }}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2"
              />
              {monthLoading && (
                <p className="mt-2 text-xs text-slate-500">Loading available dates…</p>
              )}

              <div className="mt-4 border-t border-slate-200 pt-3">
                <p className="text-sm font-medium text-slate-800">Available time</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.startsAt}
                      type="button"
                      disabled={submitting}
                      aria-label={`${slot.startsAt} available`}
                      aria-pressed={form.appointmentTime === slot.startsAt}
                      onClick={() => {
                        setForm((current) => ({ ...current, appointmentTime: slot.startsAt }));
                        setMessage("");
                      }}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs tabular-nums transition-colors",
                        form.appointmentTime === slot.startsAt
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300",
                      )}
                    >
                      {slot.startsAt}
                    </button>
                  ))}
                </div>
                {slotsLoading && (
                  <p className="mt-2 text-xs text-slate-500">Loading available times…</p>
                )}
                {!slotsLoading && !form.appointmentDate && (
                  <p className="mt-2 text-xs text-slate-500">Choose an available date first.</p>
                )}
                {!slotsLoading && form.appointmentDate && slots.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    No appointments are available on this date.
                  </p>
                )}
              </div>

              {availabilityError && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                  <p>{availabilityError}</p>
                  <button
                    type="button"
                    onClick={() =>
                      void (form.appointmentDate
                        ? loadDate(form.appointmentDate)
                        : loadMonth(new Date()))
                    }
                    className="mt-1 underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
          {message && (
            <p role="alert" className="text-sm text-rose-600">
              {message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className={cn(dashboardSecondaryButtonClassName, "min-h-10 px-4 text-sm")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(dashboardPrimaryButtonClassName, "min-h-10 px-4 text-sm")}
            >
              {submitting ? "Scheduling…" : "Complete & schedule next"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
