import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  createAdminBooking,
  deleteBooking,
  markBookingReminderSent,
  scheduleNextAppointment,
  updateBookingStatus,
  updateAdminBooking,
} from "@/features/auth/admin.functions";
import { authClient, neonAuth } from "@/features/auth/neon-auth-client";
import type {
  AdminBookingCreateInput,
  AdminBookingInput,
  BookingStatus,
  ScheduleNextAppointmentInput,
} from "@/features/book-call/booking-domain";
import { DashboardBookings } from "@/features/dashboard/dashboard-bookings";
import {
  mergePersistedBooking,
  mergeScheduledNext,
  normalizeBookingList,
  type DashboardBookingData,
} from "@/features/dashboard/dashboard-booking-data";
import type { NextAppointmentSubmitResult } from "@/features/dashboard/dashboard-next-appointment-dialog";
import { usePersistedBookingData } from "@/features/dashboard/use-persisted-booking-data";

export const Route = createFileRoute("/dashboard/bookings")({ component: DashboardBookingsRoute });

function DashboardBookingsRoute() {
  const { data: session } = authClient.useSession();
  const {
    data: bookings,
    newBookingIds,
    setData: setBookings,
    error,
    reload,
  } = usePersistedBookingData(Boolean(session?.user), { trackBookingPageVisit: true });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [reminderUpdatingId, setReminderUpdatingId] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState("");

  async function handleStatusChange(id: string, status: BookingStatus) {
    setUpdatingId(id);
    setUpdateError("");
    try {
      const token = await neonAuth.getJWTToken();
      if (!token) {
        setUpdateError("Please sign in again before updating this booking.");
        return;
      }
      const result = await updateBookingStatus({ data: { token, id, status } });
      if (!result.success) {
        setUpdateError(
          result.reason === "forbidden"
            ? "You do not have access to update bookings."
            : result.reason === "not-found"
              ? "This booking no longer exists."
              : "Could not update this booking.",
        );
        return;
      }
      setBookings((current: DashboardBookingData | undefined) =>
        current
          ? {
              ...current,
              appointments: current.appointments.map((appointment) =>
                appointment.id === result.booking.id
                  ? { ...appointment, status: result.booking.status }
                  : appointment,
              ),
            }
          : current,
      );
    } catch {
      setUpdateError("Could not update this booking.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError("");
    try {
      const token = await neonAuth.getJWTToken();
      if (!token) {
        setDeleteError("Please sign in again before deleting this booking.");
        return;
      }
      const result = await deleteBooking({ data: { token, id } });
      if (!result.success) {
        setDeleteError(
          result.reason === "forbidden"
            ? "You do not have access to delete bookings."
            : result.reason === "not-found"
              ? "This booking no longer exists."
              : "Could not delete this booking.",
        );
        return;
      }
      setBookings((current: DashboardBookingData | undefined) => {
        if (!current) return current;
        const appointments = current.appointments.filter((appointment) => appointment.id !== id);
        const deleted = current.appointments.find((appointment) => appointment.id === id);
        return {
          customers:
            deleted &&
            !appointments.some((appointment) => appointment.customerId === deleted.customerId)
              ? current.customers.filter((customer) => customer.id !== deleted.customerId)
              : current.customers,
          appointments,
        };
      });
    } catch {
      setDeleteError("Could not delete this booking.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReminderSent(id: string) {
    setReminderUpdatingId(id);
    setReminderError("");
    try {
      const token = await neonAuth.getJWTToken();
      if (!token) {
        setReminderError("Please sign in again before sending this reminder.");
        return;
      }
      const result = await markBookingReminderSent({ data: { token, id } });
      if (!result.success) {
        setReminderError(
          result.reason === "forbidden"
            ? "You do not have access to update reminders."
            : result.reason === "not-found"
              ? "This booking no longer exists."
              : "Could not update this reminder.",
        );
        return;
      }
      setBookings((current: DashboardBookingData | undefined) =>
        current
          ? {
              ...current,
              appointments: current.appointments.map((appointment) =>
                appointment.id === id ? { ...appointment, reminderStatus: "sent" } : appointment,
              ),
            }
          : current,
      );
    } catch {
      setReminderError("Could not update this reminder.");
    } finally {
      setReminderUpdatingId(null);
    }
  }

  async function handleScheduleNext(
    input: ScheduleNextAppointmentInput,
  ): Promise<NextAppointmentSubmitResult> {
    const token = await neonAuth.getJWTToken();
    if (!token) return { success: false, reason: "forbidden" };
    const result = await scheduleNextAppointment({ data: { token, input } });
    if (!result.success) {
      if (result.reason === "not-found" || result.reason === "cancelled") void reload();
      return result;
    }
    setBookings((current) =>
      current
        ? mergeScheduledNext(current, result.currentBooking, result.nextBooking)
        : normalizeBookingList([result.currentBooking, result.nextBooking]),
    );
    return { success: true };
  }

  async function handleCreate(input: AdminBookingCreateInput) {
    const token = await neonAuth.getJWTToken();
    if (!token) return { success: false, reason: "forbidden" };
    const result = await createAdminBooking({ data: { token, input } });
    if (result.success)
      setBookings((current) =>
        current
          ? mergePersistedBooking(current, result.booking)
          : normalizeBookingList([result.booking]),
      );
    return result;
  }

  async function handleUpdate(id: string, input: AdminBookingInput) {
    const token = await neonAuth.getJWTToken();
    if (!token) return { success: false, reason: "forbidden" };
    const result = await updateAdminBooking({ data: { token, id, input } });
    if (result.success)
      setBookings((current) =>
        current
          ? mergePersistedBooking(current, result.booking)
          : normalizeBookingList([result.booking]),
      );
    return result;
  }

  if (!session?.user)
    return (
      <a href="/auth" className="text-sm text-violet-700 underline">
        Sign in to view bookings.
      </a>
    );
  if (error)
    return (
      <p role="alert" className="text-sm text-rose-600">
        {error}
      </p>
    );
  if (!bookings) return <p className="text-sm text-slate-600">Loading bookings…</p>;
  return (
    <DashboardBookings
      customers={bookings.customers}
      appointments={bookings.appointments}
      newBookingIds={newBookingIds}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onStatusChange={handleStatusChange}
      updatingId={updatingId}
      updateError={updateError}
      onDelete={handleDelete}
      deletingId={deletingId}
      deleteError={deleteError}
      onReminderSent={handleReminderSent}
      reminderUpdatingId={reminderUpdatingId}
      reminderError={reminderError}
      onScheduleNext={handleScheduleNext}
    />
  );
}
