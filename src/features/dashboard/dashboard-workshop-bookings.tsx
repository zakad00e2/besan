import { Bell, Eye, MessageCircle, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
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
  workshopBookingStatuses,
  type WorkshopBookingAdminUpdateInput,
  type WorkshopId,
  type WorkshopBookingListItem,
  type WorkshopBookingStatus,
} from "@/features/workshop-booking/workshop-booking";
import { DashboardEmptyState, StatusBadge } from "./dashboard-ui";

export type WorkshopBookingFilters = {
  query: string;
  workshopId: string | "all";
  status: WorkshopBookingStatus | "all";
};

const statusLabels: Record<WorkshopBookingStatus, string> = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const tableActionGroupClassName =
  "inline-flex items-center overflow-hidden rounded-lg border border-[#e8e8ec] bg-white shadow-[0_1px_2px_rgba(24,24,27,0.03)]";
const tableActionButtonClassName =
  "inline-flex size-7 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400 disabled:cursor-wait disabled:opacity-60";
const tableActionDividerClassName = "h-4 w-px shrink-0 bg-[#ececef]";

function getWorkshopActionLinks(booking: WorkshopBookingListItem) {
  const whatsappNumber = booking.mobile.replace(/\D/g, "");
  const dateClause = booking.date ? ` on ${booking.date}` : "";
  const reminderMessage = `Hi ${booking.fullName}, this is a reminder for your ${booking.workshopName} workshop${dateClause}.`;
  return {
    reminderHref: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(reminderMessage)}`,
    messageHref: `https://wa.me/${whatsappNumber}`,
  };
}

export function filterWorkshopBookings(
  bookings: WorkshopBookingListItem[],
  filters: WorkshopBookingFilters,
) {
  const query = filters.query.trim().toLocaleLowerCase();

  return bookings.filter((booking) => {
    const matchesQuery =
      !query ||
      [booking.fullName, booking.mobile, booking.email].some((value) =>
        value.toLocaleLowerCase().includes(query),
      );
    return (
      matchesQuery &&
      (filters.workshopId === "all" || booking.workshopId === filters.workshopId) &&
      (filters.status === "all" || booking.status === filters.status)
    );
  });
}

function StatusSelect({
  booking,
  updating,
  onStatusChange,
}: {
  booking: WorkshopBookingListItem;
  updating: boolean;
  onStatusChange: (id: string, status: WorkshopBookingStatus) => void;
}) {
  return (
    <select
      aria-label={`Status for ${booking.fullName}`}
      value={booking.status}
      disabled={updating}
      onChange={(event) => onStatusChange(booking.id, event.target.value as WorkshopBookingStatus)}
      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 disabled:cursor-wait disabled:opacity-60"
    >
      {workshopBookingStatuses.map((status) => (
        <option key={status} value={status}>
          {statusLabels[status]}
        </option>
      ))}
    </select>
  );
}

export function DashboardWorkshopBookings({
  bookings,
  onStatusChange,
  onEdit = () => undefined,
  editingId = null,
  editError = "",
  onDelete = () => undefined,
  deletingId = null,
  deleteError = "",
  updatingId = null,
  updateError = "",
}: {
  bookings: WorkshopBookingListItem[];
  onStatusChange: (id: string, status: WorkshopBookingStatus) => void;
  onEdit?: (id: string, input: WorkshopBookingAdminUpdateInput) => void | Promise<void>;
  editingId?: string | null;
  editError?: string;
  onDelete?: (id: string) => void | Promise<void>;
  deletingId?: string | null;
  deleteError?: string;
  updatingId?: string | null;
  updateError?: string;
}) {
  type WorkshopBookingEditForm = Omit<
    WorkshopBookingAdminUpdateInput,
    "workshopId" | "date"
  > & { date: string };
  const [filters, setFilters] = useState<WorkshopBookingFilters>({
    query: "",
    workshopId: "all",
    status: "all",
  });
  const [editingBooking, setEditingBooking] = useState<WorkshopBookingListItem | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<WorkshopBookingListItem | null>(null);
  const [notePreview, setNotePreview] = useState<WorkshopBookingListItem | null>(null);
  const [editFormError, setEditFormError] = useState("");
  const [editForm, setEditForm] = useState<WorkshopBookingEditForm>({
    fullName: "",
    mobile: "",
    email: "",
    date: "",
    participants: 1,
  });
  const visibleBookings = useMemo(
    () => filterWorkshopBookings(bookings, filters),
    [bookings, filters],
  );
  const workshops = useMemo(
    () =>
      Array.from(
        new Map(bookings.map((booking) => [booking.workshopId, booking.workshopName])).entries(),
      ),
    [bookings],
  );

  function openEdit(booking: WorkshopBookingListItem) {
    setEditForm({
      fullName: booking.fullName,
      mobile: booking.mobile,
      email: booking.email,
      date: booking.date ?? "",
      participants: booking.participants,
    });
    setEditFormError("");
    setEditingBooking(booking);
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingBooking) return;
    const input: WorkshopBookingAdminUpdateInput = {
      workshopId: editingBooking.workshopId as WorkshopId,
      fullName: editForm.fullName.trim(),
      mobile: editForm.mobile.trim(),
      email: editForm.email.trim(),
      date: editForm.date || null,
      participants: Number(editForm.participants),
    };
    if (
      !input.fullName ||
      !input.mobile ||
      (input.workshopId === "corset-workshop" && !input.date) ||
      !Number.isInteger(input.participants) ||
      input.participants < 1
    ) {
      setEditFormError("Complete the required fields with a valid participant count.");
      return;
    }
    void onEdit(editingBooking.id, input);
    setEditingBooking(null);
  }

  return (
    <section className="space-y-5" dir="ltr">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-end">
        <label className="relative block flex-1 text-xs font-normal text-slate-600">
          Search workshop bookings
          <Search
            className="pointer-events-none absolute bottom-3 left-3 size-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            aria-label="Search workshop bookings"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 pl-9 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </label>
        <label className="text-xs font-normal text-slate-600">
          Workshop
          <select
            aria-label="Workshop"
            value={filters.workshopId}
            onChange={(event) =>
              setFilters({
                ...filters,
                workshopId: event.target.value as WorkshopBookingFilters["workshopId"],
              })
            }
            className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">All workshops</option>
            {workshops.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-normal text-slate-600">
          Booking status
          <select
            aria-label="Booking status"
            value={filters.status}
            onChange={(event) =>
              setFilters({
                ...filters,
                status: event.target.value as WorkshopBookingFilters["status"],
              })
            }
            className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">All statuses</option>
            {workshopBookingStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {updateError && (
        <p role="alert" className="text-sm text-rose-600">
          {updateError}
        </p>
      )}
      {editError && (
        <p role="alert" className="text-sm text-rose-600">
          {editError}
        </p>
      )}
      {deleteError && (
        <p role="alert" className="text-sm text-rose-600">
          {deleteError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {visibleBookings.length === 0 ? (
          <div className="p-4">
            <DashboardEmptyState
              title="No workshop bookings"
              body="Try changing the search or filters."
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] text-slate-500 [&_th]:font-normal">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th>Mobile</th>
                    <th>Workshop</th>
                    <th>Date</th>
                    <th>Participants</th>
                    <th>Notes</th>
                    <th className="px-4">Update status</th>
                    <th className="px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{booking.fullName}</td>
                      <td className="text-slate-500" dir="ltr">
                        {booking.mobile}
                      </td>
                      <td className="text-slate-500">{booking.workshopName}</td>
                      <td className="text-slate-500" dir="ltr">
                        {booking.date ?? "Not set"}
                      </td>
                      <td className="text-slate-500">{booking.participants}</td>
                      <td className="max-w-48 text-slate-500">
                        {booking.notes && booking.notes.length > 44 && (
                          <div className="flex items-center gap-1">
                            <span className="truncate" title={booking.notes}>
                              {`${booking.notes.slice(0, 44)}…`}
                            </span>
                            <button
                              type="button"
                              aria-label={`View full notes for ${booking.fullName}`}
                              title="View full notes"
                              onClick={() => setNotePreview(booking)}
                              className="inline-flex size-6 shrink-0 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                              <Eye className="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                        <span
                          className={booking.notes && booking.notes.length > 44 ? "hidden" : ""}
                        >
                          {booking.notes || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusSelect
                          booking={booking}
                          updating={updatingId === booking.id}
                          onStatusChange={onStatusChange}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className={tableActionGroupClassName}>
                          <a
                            href={getWorkshopActionLinks(booking).reminderHref}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Send reminder to ${booking.fullName}`}
                            title="Send reminder"
                            className={`${tableActionButtonClassName} text-amber-600 hover:bg-amber-50`}
                          >
                            <Bell className="size-3.5" aria-hidden="true" />
                          </a>
                          <span className={tableActionDividerClassName} aria-hidden="true" />
                          <a
                            href={getWorkshopActionLinks(booking).messageHref}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Message ${booking.fullName} on WhatsApp`}
                            title="Message on WhatsApp"
                            className={`${tableActionButtonClassName} text-emerald-600 hover:bg-emerald-50`}
                          >
                            <MessageCircle className="size-3.5" aria-hidden="true" />
                          </a>
                          <span className={tableActionDividerClassName} aria-hidden="true" />
                          <button
                            type="button"
                            aria-label={`Edit ${booking.fullName}`}
                            title="Edit booking"
                            disabled={editingId === booking.id || deletingId === booking.id}
                            onClick={() => openEdit(booking)}
                            className={`${tableActionButtonClassName} text-violet-600 hover:bg-violet-50`}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </button>
                          <span className={tableActionDividerClassName} aria-hidden="true" />
                          <button
                            type="button"
                            aria-label={`Delete ${booking.fullName}`}
                            title="Delete booking"
                            disabled={editingId === booking.id || deletingId === booking.id}
                            onClick={() => setDeletingBooking(booking)}
                            className={`${tableActionButtonClassName} text-rose-600 hover:bg-rose-50`}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {visibleBookings.map((booking) => (
                <article key={booking.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{booking.fullName}</p>
                      <p className="mt-1 text-xs text-slate-500">{booking.workshopName}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span dir="ltr">{booking.mobile}</span>
                    <span dir="ltr">{booking.date ?? "Not set"}</span>
                    <span>{booking.participants} participants</span>
                  </div>
                  <p className="text-xs text-slate-500">{booking.notes || "No notes"}</p>
                  <StatusSelect
                    booking={booking}
                    updating={updatingId === booking.id}
                    onStatusChange={onStatusChange}
                  />
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={getWorkshopActionLinks(booking).messageHref}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Message ${booking.fullName} on WhatsApp`}
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      WhatsApp
                    </a>
                    <button
                      type="button"
                      aria-label={`Edit ${booking.fullName}`}
                      disabled={editingId === booking.id || deletingId === booking.id}
                      onClick={() => openEdit(booking)}
                      className="text-xs text-violet-700 hover:underline disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${booking.fullName}`}
                      disabled={editingId === booking.id || deletingId === booking.id}
                      onClick={() => setDeletingBooking(booking)}
                      className="text-xs text-rose-700 hover:underline disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog
        open={Boolean(notePreview)}
        onOpenChange={(isOpen) => !isOpen && setNotePreview(null)}
      >
        <DialogContent dir="ltr" className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium leading-none tracking-tight">Workshop notes</DialogTitle>
            <DialogDescription>{notePreview?.fullName}</DialogDescription>
          </DialogHeader>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {notePreview?.notes}
          </p>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingBooking)}
        onOpenChange={(open) => !open && setEditingBooking(null)}
      >
        <DialogContent dir="ltr" className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Edit workshop booking</DialogTitle>
            <DialogDescription>
              Update the customer and attendance details for this workshop.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitEdit}>
            <label className="block text-sm text-slate-700">
              Full name
              <input
                aria-label="Full name"
                value={editForm.fullName}
                onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                required
              />
            </label>
            <label className="block text-sm text-slate-700">
              Mobile
              <input
                aria-label="Mobile"
                value={editForm.mobile}
                onChange={(event) => setEditForm({ ...editForm, mobile: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                required
              />
            </label>
            <label className="block text-sm text-slate-700">
              Email
              <input
                aria-label="Email"
                type="email"
                value={editForm.email}
                onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
              />
            </label>
            <label className="block text-sm text-slate-700">
              Date
              <input
                aria-label="Date"
                type="date"
                value={editForm.date}
                onChange={(event) => setEditForm({ ...editForm, date: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                required={editingBooking?.workshopId === "corset-workshop"}
              />
            </label>
            <label className="block text-sm text-slate-700">
              Participants
              <input
                aria-label="Participants"
                type="number"
                min="1"
                step="1"
                value={editForm.participants}
                onChange={(event) =>
                  setEditForm({ ...editForm, participants: Number(event.target.value) })
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                required
              />
            </label>
            {editFormError && (
              <p role="alert" className="text-sm text-rose-600">
                {editFormError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editingId === editingBooking?.id}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                Save changes
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingBooking)}
        onOpenChange={(open) => !open && setDeletingBooking(null)}
      >
        <AlertDialogContent dir="ltr" className="max-w-md bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workshop booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the booking for {deletingBooking?.fullName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingId === deletingBooking?.id}
              onClick={() => {
                if (deletingBooking) void onDelete(deletingBooking.id);
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              Delete booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
