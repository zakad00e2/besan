import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  workshopBookingStatuses,
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
  updatingId = null,
  updateError = "",
}: {
  bookings: WorkshopBookingListItem[];
  onStatusChange: (id: string, status: WorkshopBookingStatus) => void;
  updatingId?: string | null;
  updateError?: string;
}) {
  const [filters, setFilters] = useState<WorkshopBookingFilters>({
    query: "",
    workshopId: "all",
    status: "all",
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
                    <th>Email</th>
                    <th>Workshop</th>
                    <th>Date</th>
                    <th>Participants</th>
                    <th>Status</th>
                    <th className="px-4">Update status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{booking.fullName}</td>
                      <td className="text-slate-500" dir="ltr">
                        {booking.mobile}
                      </td>
                      <td className="text-slate-500">{booking.email || "—"}</td>
                      <td className="text-slate-500">{booking.workshopName}</td>
                      <td className="text-slate-500" dir="ltr">
                        {booking.date}
                      </td>
                      <td className="text-slate-500">{booking.participants}</td>
                      <td>
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusSelect
                          booking={booking}
                          updating={updatingId === booking.id}
                          onStatusChange={onStatusChange}
                        />
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
                    <span dir="ltr">{booking.date}</span>
                    <span>{booking.email || "No email"}</span>
                    <span>{booking.participants} participants</span>
                  </div>
                  <StatusSelect
                    booking={booking}
                    updating={updatingId === booking.id}
                    onStatusChange={onStatusChange}
                  />
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
