# New Booking Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each supervisor's latest successful `/dashboard/bookings` visit and mark only design bookings created after that visit as new.

**Architecture:** A Neon table stores a monotonic `last_seen_at` keyed by the verified Neon Auth subject. The bookings-page response returns the old checkpoint and a server snapshot; only that route saves the snapshot after the list loads. The shared data hook derives new booking IDs and the booking table renders them as badges.

**Tech Stack:** React 19, TypeScript, TanStack Start server functions, Neon Postgres, Vitest, Testing Library, Tailwind CSS 4.

## Global Constraints

- Neon Postgres is the only visit-state store; do not use local storage, cookies, or in-memory checkpoints.
- Track only `/dashboard/bookings`; overview and customer pages must never advance the checkpoint.
- A first successful visit saves a baseline and marks no historical booking as new.
- A failed list load or failed checkpoint write must never suppress a later new-booking indicator.
- Use the verified token `sub` as the supervisor ID; never accept it from the browser.
- Preserve existing filters, sorting, booking mutations, and safe authorization/error behavior.

---

## File Structure

- `db/migrations/006_create_booking_page_views.sql` â€” durable per-supervisor checkpoint table.
- `src/features/book-call/booking-page-view-repository.server.ts` and test â€” parameterized checkpoint persistence.
- `src/features/auth/admin-auth.server.ts` â€” exposes the verified supervisor ID.
- `src/features/auth/admin.functions.ts` and test â€” booking-page snapshot and acknowledgement server functions.
- `src/features/dashboard/dashboard-model.ts`, `dashboard-booking-data.ts`, and test â€” preserves booking creation time.
- `src/features/dashboard/use-persisted-booking-data.ts` and test â€” optional route-specific tracking and new ID set.
- `src/routes/dashboard/bookings.tsx` â€” enables tracking and passes IDs.
- `src/features/dashboard/dashboard-bookings.tsx` and test â€” desktop and mobile badge.

### Task 1: Persist booking-page visits

**Files:**
- Create: `db/migrations/006_create_booking_page_views.sql`
- Create: `src/features/book-call/booking-page-view-repository.server.ts`
- Test: `src/features/book-call/booking-page-view-repository.server.test.ts`

**Interfaces:**
- Produces `BookingPageViewRepository`:
  `getLastSeen(supervisorId: string): Promise<string | null>`,
  `getSnapshotAt(): Promise<string>`, and
  `saveLastSeen(supervisorId: string, seenAt: string): Promise<void>`.
- Consumes `QueryExecutor` from `booking-repository.server.ts`.

- [ ] **Step 1: Write the failing repository tests**

```ts
it("reads the stored checkpoint and a server snapshot", async () => {
  const execute = vi.fn<QueryExecutor>()
    .mockResolvedValueOnce([{ last_seen_at: "2026-07-17T08:00:00.000Z" }])
    .mockResolvedValueOnce([{ snapshot_at: "2026-07-17T09:00:00.000Z" }]);
  const repository = createBookingPageViewRepository(execute);

  await expect(repository.getLastSeen("supervisor-1")).resolves.toBe("2026-07-17T08:00:00.000Z");
  await expect(repository.getSnapshotAt()).resolves.toBe("2026-07-17T09:00:00.000Z");
  expect(execute).toHaveBeenNthCalledWith(1, expect.stringContaining("WHERE supervisor_id = $1"), ["supervisor-1"]);
});

it("upserts a monotonic checkpoint", async () => {
  const execute = vi.fn<QueryExecutor>().mockResolvedValue([]);
  await createBookingPageViewRepository(execute).saveLastSeen("supervisor-1", "2026-07-17T09:00:00.000Z");
  expect(execute).toHaveBeenCalledWith(expect.stringMatching(/ON CONFLICT \(supervisor_id\)[\s\S]+GREATEST/), ["supervisor-1", "2026-07-17T09:00:00.000Z"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/book-call/booking-page-view-repository.server.test.ts`

Expected: FAIL because the repository has not been created.

- [ ] **Step 3: Implement migration and repository**

```sql
CREATE TABLE IF NOT EXISTS public.supervisor_booking_page_views (
  supervisor_id text PRIMARY KEY,
  last_seen_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS supervisor_booking_page_views_last_seen_at_idx
  ON public.supervisor_booking_page_views (last_seen_at DESC);
```

```ts
export type BookingPageViewRepository = {
  getLastSeen(supervisorId: string): Promise<string | null>;
  getSnapshotAt(): Promise<string>;
  saveLastSeen(supervisorId: string, seenAt: string): Promise<void>;
};

const lastSeenQuery = `SELECT last_seen_at::text FROM public.supervisor_booking_page_views WHERE supervisor_id = $1`;
const snapshotQuery = `SELECT clock_timestamp()::text AS snapshot_at`;
const saveLastSeenQuery = `
INSERT INTO public.supervisor_booking_page_views (supervisor_id, last_seen_at)
VALUES ($1, $2::timestamptz)
ON CONFLICT (supervisor_id) DO UPDATE
SET last_seen_at = GREATEST(public.supervisor_booking_page_views.last_seen_at, EXCLUDED.last_seen_at)`;

export function createBookingPageViewRepository(execute: QueryExecutor): BookingPageViewRepository {
  return {
    async getLastSeen(supervisorId) {
      const rows = await execute<{ last_seen_at: string }>(lastSeenQuery, [supervisorId]);
      return rows[0]?.last_seen_at ?? null;
    },
    async getSnapshotAt() {
      const rows = await execute<{ snapshot_at: string }>(snapshotQuery);
      if (!rows[0]) throw new Error("Missing database snapshot timestamp.");
      return rows[0].snapshot_at;
    },
    async saveLastSeen(supervisorId, seenAt) {
      await execute(saveLastSeenQuery, [supervisorId, seenAt]);
    },
  };
}
```

Add the Neon executor and `getNeonBookingPageViewRepository()` following the existing booking repository pattern.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/features/book-call/booking-page-view-repository.server.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/006_create_booking_page_views.sql src/features/book-call/booking-page-view-repository.server.ts src/features/book-call/booking-page-view-repository.server.test.ts
git commit -m "feat: persist booking page visits"
```

### Task 2: Add authorized booking-page read and acknowledgement functions

**Files:**
- Modify: `src/features/auth/admin-auth.server.ts`
- Modify: `src/features/auth/admin.functions.ts`
- Modify: `src/features/auth/admin.functions.test.ts`

**Interfaces:**
- Produces `loadBookingsPageForAdmin(token)` with `bookings`, `lastSeenAt`, and `snapshotAt`.
- Produces `markBookingsPageSeenForAdmin({ token, seenAt })` and public server function `markBookingsPageSeen`.

- [ ] **Step 1: Write failing admin-function tests**

```ts
function bookingPageDependencies(lastSeenAt: string | null = null) {
  const pageViewRepository = {
    getLastSeen: vi.fn().mockResolvedValue(lastSeenAt),
    getSnapshotAt: vi.fn().mockResolvedValue("2026-07-17T09:00:00.000Z"),
    saveLastSeen: vi.fn().mockResolvedValue(undefined),
  };
  return {
    verifyAdminToken: vi.fn().mockResolvedValue({ allowed: true, supervisorId: "supervisor-1" }),
    getBookingRepository: vi.fn(() => ({ list: vi.fn().mockResolvedValue([appointment]) })),
    getBookingPageViewRepository: vi.fn(() => pageViewRepository),
    pageViewRepository,
  };
}

it("returns the old checkpoint and a snapshot", async () => {
  const deps = bookingPageDependencies("2026-07-17T08:00:00.000Z");
  await expect(loadBookingsPageForAdmin("token", deps)).resolves.toEqual({
    success: true, bookings: [appointment], lastSeenAt: "2026-07-17T08:00:00.000Z", snapshotAt: "2026-07-17T09:00:00.000Z",
  });
});

it("saves a verified checkpoint and maps storage failures safely", async () => {
  const deps = bookingPageDependencies();
  await expect(markBookingsPageSeenForAdmin({ token: "token", seenAt: "2026-07-17T09:00:00.000Z" }, deps)).resolves.toEqual({ success: true });
  expect(deps.pageViewRepository.saveLastSeen).toHaveBeenCalledWith("supervisor-1", "2026-07-17T09:00:00.000Z");
  deps.pageViewRepository.saveLastSeen.mockRejectedValueOnce(new Error("database unavailable"));
  await expect(markBookingsPageSeenForAdmin({ token: "token", seenAt: "2026-07-17T10:00:00.000Z" }, deps)).resolves.toEqual({ success: false, reason: "save-error" });
});
```

Cover a forbidden token and a missing `supervisorId` with `{ success: false, reason: "forbidden" }`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/auth/admin.functions.test.ts`

Expected: FAIL because the booking-page functions do not exist.

- [ ] **Step 3: Implement verified identity and server functions**

In `verifyAdminToken`, derive the ID from the verified payload and require it:

```ts
const supervisorId = typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
return {
  allowed: supervisorId !== null && isAdminEmail(payload.email, DEFAULT_ADMIN_EMAIL),
  supervisorId,
};
```

Add dedicated read dependencies using `getNeonBookingRepository` and Task 1's `getNeonBookingPageViewRepository`. `loadBookingsPageForAdmin` must verify the token, then call `getLastSeen`, `getSnapshotAt`, and `list` in that order; map repository failures to `load-error`. Change existing `getBookings` to call this function, preserving the `bookings` property for current consumers.

`markBookingsPageSeenForAdmin` must verify the same subject and call `saveLastSeen(access.supervisorId, seenAt)`. Its server wrapper must validate an ISO timestamp:

```ts
export const markBookingsPageSeen = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), seenAt: z.string().datetime() }))
  .handler(({ data }) => markBookingsPageSeenForAdmin(data));
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/features/auth/admin.functions.test.ts`

Expected: PASS, including first visit, forbidden access, and save failure.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/admin-auth.server.ts src/features/auth/admin.functions.ts src/features/auth/admin.functions.test.ts
git commit -m "feat: expose booking page checkpoints"
```

### Task 3: Preserve creation time and calculate new IDs only for the bookings page

**Files:**
- Modify: `src/features/dashboard/dashboard-model.ts`
- Modify: `src/features/dashboard/dashboard-booking-data.ts`
- Modify: `src/features/dashboard/dashboard-booking-data.test.ts`
- Modify: `src/features/dashboard/use-persisted-booking-data.ts`
- Create: `src/features/dashboard/use-persisted-booking-data.test.tsx`
- Modify: `src/routes/dashboard/bookings.tsx`

**Interfaces:**
- Produces `Appointment.createdAt: string`.
- Produces `usePersistedBookingData(enabled, { trackBookingPageVisit: true }).newBookingIds: ReadonlySet<string>`.

- [ ] **Step 1: Write failing mapping and hook tests**

```ts
expect(normalizeBookingList([first]).appointments[0]).toMatchObject({
  id: first.id,
  createdAt: "2026-07-01T10:00:00.000Z",
});
```

```tsx
it("marks only bookings after the checkpoint and saves the snapshot", async () => {
  getBookings.mockResolvedValue({
    success: true,
    bookings: [{ ...first, id: "old", createdAt: "2026-07-17T08:00:00.000Z" }, { ...first, id: "new", createdAt: "2026-07-17T08:30:00.000Z" }],
    lastSeenAt: "2026-07-17T08:15:00.000Z",
    snapshotAt: "2026-07-17T09:00:00.000Z",
  });
  const { result } = renderHook(() => usePersistedBookingData(true, { trackBookingPageVisit: true }));
  await waitFor(() => expect(result.current.data).toBeDefined());
  expect(result.current.newBookingIds).toEqual(new Set(["new"]));
  await waitFor(() => expect(markBookingsPageSeen).toHaveBeenCalledWith({
    data: { token: "admin-token", seenAt: "2026-07-17T09:00:00.000Z" },
  }));
});
```

Also test `lastSeenAt: null` returns an empty ID set while saving the baseline, tracking disabled never writes, and a rejected save leaves the rendered ID set unchanged.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/use-persisted-booking-data.test.tsx`

Expected: FAIL because creation time, tracking option, and ID set do not exist.

- [ ] **Step 3: Implement data flow and route wiring**

```ts
export type Appointment = {
  id: string;
  customerId: string;
  type: BookingType;
  purpose: string;
  notes?: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  status: AppointmentStatus;
  reminderStatus: ReminderStatus;
};

// mapAppointment
createdAt: booking.createdAt,
```

```ts
type PersistedBookingDataOptions = { trackBookingPageVisit?: boolean };

export function usePersistedBookingData(
  enabled: boolean,
  { trackBookingPageVisit = false }: PersistedBookingDataOptions = {},
) {
  const [newBookingIds, setNewBookingIds] = useState<ReadonlySet<string>>(new Set());
  // retain the existing data, error, loading, and reload state
}
```

After a successful response, set normalized data. If tracking is enabled, compare each `booking.createdAt` to `lastSeenAt`; when the checkpoint is null, set an empty set. Then fire `void markBookingsPageSeen({ data: { token, seenAt: snapshotAt } })`. Do not clear displayed data or IDs if this acknowledgement fails; clear IDs when disabled and before a new load.

Enable this option only in the bookings route and pass `newBookingIds` to `DashboardBookings`:

```tsx
const { data: bookings, newBookingIds, setData: setBookings, error, reload } =
  usePersistedBookingData(Boolean(session?.user), { trackBookingPageVisit: true });

<DashboardBookings
  customers={bookings.customers}
  appointments={bookings.appointments}
  newBookingIds={newBookingIds}
/>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/use-persisted-booking-data.test.tsx`

Expected: PASS with first-visit, later-visit, disabled-tracking, and failed-save coverage.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-booking-data.ts src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/use-persisted-booking-data.ts src/features/dashboard/use-persisted-booking-data.test.tsx src/routes/dashboard/bookings.tsx
git commit -m "feat: track new booking ids"
```

### Task 4: Render an accessible new-booking badge

**Files:**
- Modify: `src/features/dashboard/dashboard-bookings.tsx`
- Modify: `src/features/dashboard/dashboard-bookings.test.tsx`

**Interfaces:**
- Consumes `newBookingIds?: ReadonlySet<string>`.
- Produces visible `New booking` text in both responsive layouts.

- [ ] **Step 1: Write failing component tests**

```tsx
it("shows badges only for supplied booking IDs", () => {
  render(<DashboardBookings customers={dashboardFixture.customers} appointments={dashboardFixture.appointments} newBookingIds={new Set(["appointment-1"])} />);
  expect(screen.getAllByText("New booking")).toHaveLength(2);
  expect(screen.getAllByLabelText("New booking")).toHaveLength(2);
});

it("does not show a badge without new IDs", () => {
  render(<DashboardBookings customers={dashboardFixture.customers} appointments={dashboardFixture.appointments} />);
  expect(screen.queryByText("New booking")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/dashboard/dashboard-bookings.test.tsx`

Expected: FAIL because the prop and badges do not exist.

- [ ] **Step 3: Implement responsive badges**

Add `newBookingIds = new Set<string>()` to the component props. In both the desktop customer cell and mobile customer heading, append this when `newBookingIds.has(appointment.id)`:

```tsx
<span
  aria-label="New booking"
  className="ml-2 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700"
>
  New booking
</span>
```

Do not alter customer links, status controls, table columns, or actions. Text is the required indicator; color is supplemental.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/dashboard/dashboard-bookings.test.tsx`

Expected: PASS, including existing booking management tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx
git commit -m "feat: show new booking indicator"
```

### Task 5: Verify the integrated feature

**Files:**
- Modify only a Task 1â€“4 file if verification finds a defect.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/features/book-call/booking-page-view-repository.server.test.ts src/features/auth/admin.functions.test.ts src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/use-persisted-booking-data.test.tsx src/features/dashboard/dashboard-bookings.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run full checks**

Run: `npm test; npm run lint; npm run build`

Expected: each command exits with status 0.

- [ ] **Step 3: Inspect final scope**

Run: `git diff --check; git status --short; git log --oneline -4`

Expected: no whitespace errors; preserve all unrelated pre-existing worktree changes.

- [ ] **Step 4: Commit a verification-only correction if one was necessary**

```bash
git add db/migrations/006_create_booking_page_views.sql src/features/book-call/booking-page-view-repository.server.ts src/features/book-call/booking-page-view-repository.server.test.ts src/features/auth/admin-auth.server.ts src/features/auth/admin.functions.ts src/features/auth/admin.functions.test.ts src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-booking-data.ts src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/use-persisted-booking-data.ts src/features/dashboard/use-persisted-booking-data.test.tsx src/routes/dashboard/bookings.tsx src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx
git commit -m "fix: verify new booking indicator"
```

Run this final commit only if Task 5 changes a feature file after Task 4.
