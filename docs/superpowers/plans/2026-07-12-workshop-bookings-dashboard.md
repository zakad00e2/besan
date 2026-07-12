# Workshop Bookings Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist customer workshop requests in Neon, display them on a dedicated authenticated dashboard page, and remove workshop records from the general appointment workflow.

**Architecture:** A workshop-booking domain module validates the shared public payload and status values. A server-only repository owns Neon SQL, a public server function creates requests, authenticated admin functions list and update them, and focused React components handle the customer dialog and admin table.

**Tech Stack:** TypeScript 5.8, React 19, TanStack Start/Router, Neon Serverless Postgres, Zod 3, Vitest 4, Testing Library, Tailwind CSS 4.

## Global Constraints

- Add a forward-only migration; do not edit `db/migrations/001_create_booking_tables.sql`.
- Do not rewrite published git history or include unrelated dirty-worktree changes in commits.
- Customer submission stays public; listing and status updates require existing admin JWT verification.
- The dashboard remains English and left-to-right.
- Existing appointment booking behavior must remain working.
- Do not add dependencies.

---

## File Map

- Create `db/migrations/002_create_workshop_bookings.sql`: workshop request table, constraints, and indexes.
- Modify `src/features/workshop-booking/workshop-booking.ts`: canonical workshop definitions, request/status types, and server-safe validation.
- Create `src/features/workshop-booking/workshop-booking-repository.server.ts`: parameterized create/list/update SQL.
- Create `src/features/workshop-booking/workshop-booking-service.ts`: storage-safe submission orchestration.
- Create `src/features/workshop-booking/workshop-booking.functions.ts`: public create server function.
- Create `src/features/auth/admin.functions.test.ts`: authenticated workshop admin boundary tests.
- Modify `src/features/workshop-booking/workshop-booking-dialog.tsx`: async real submission states.
- Create `src/features/dashboard/dashboard-workshop-bookings.tsx`: filters, responsive table, status controls.
- Modify `src/features/auth/admin.functions.ts`: authenticated workshop list and status update functions.
- Create `src/routes/dashboard/workshop-bookings.tsx`: authenticated data loading and update coordination.
- Modify `src/features/dashboard/dashboard-shell.tsx`: navigation, title, and description.
- Modify `src/features/dashboard/dashboard-bookings.tsx`: remove workshop type choices from general appointment UI.
- Modify `src/features/dashboard/dashboard-bookings.test.tsx` and `src/features/dashboard/dashboard-shell.test.tsx`: separation/navigation coverage.
- Regenerate `src/routeTree.gen.ts`: register the new file route.

### Task 1: Domain model and database migration

**Files:**
- Create: `db/migrations/002_create_workshop_bookings.sql`
- Modify: `src/features/workshop-booking/workshop-booking.ts`
- Test: `src/features/workshop-booking/workshop-booking.test.ts`

**Interfaces:**
- Produces: `workshopOptions`, `WorkshopBookingInput`, `ValidatedWorkshopBooking`, `WorkshopBookingStatus`, `WorkshopBookingListItem`, `parseWorkshopBookingInput(input, today?)`, and `parseWorkshopBookingStatus(status)`.

- [ ] **Step 1: Extend failing domain tests**

Add tests that exercise the same payload shape used by both browser and server:

```ts
import {
  parseWorkshopBookingInput,
  parseWorkshopBookingStatus,
  workshopOptions,
} from "./workshop-booking";

const validInput = {
  workshopId: "mini-course",
  workshopName: "Private mini course",
  fullName: "Noor Al-Hashemi",
  mobile: "+970 59 123 4567",
  email: "noor@example.com",
  date: "2026-07-13",
  participants: 3,
  notes: "Vegetarian lunch",
};

it("normalizes a valid server submission", () => {
  expect(parseWorkshopBookingInput(validInput, new Date("2026-07-12T08:00:00Z"))).toEqual({
    success: true,
    data: { ...validInput, mobile: "+970591234567" },
  });
});

it("rejects unknown and mismatched workshops", () => {
  expect(
    parseWorkshopBookingInput(
      { ...validInput, workshopName: "Invented workshop" },
      new Date("2026-07-12T08:00:00Z"),
    ),
  ).toMatchObject({ success: false, errors: { workshop: "Choose a valid workshop." } });
  expect(workshopOptions).toHaveLength(3);
});

it("accepts only supported statuses", () => {
  expect(parseWorkshopBookingStatus("confirmed")).toEqual({ success: true, data: "confirmed" });
  expect(parseWorkshopBookingStatus("refunded")).toEqual({ success: false });
});
```

- [ ] **Step 2: Run the domain test and verify failure**

Run: `npm test -- src/features/workshop-booking/workshop-booking.test.ts`

Expected: FAIL because the new exports and server-input parser do not exist.

- [ ] **Step 3: Implement the shared domain**

Define the canonical values and validate unknown runtime input with Zod before normalizing it:

```ts
export const workshopOptions = [
  { id: "pattern-foundation", name: "Pattern foundation" },
  { id: "mini-course", name: "Private mini course" },
  { id: "corset-workshop", name: "One-day corset workshop" },
] as const;

export const workshopBookingStatuses = ["pending", "confirmed", "completed", "cancelled"] as const;
export type WorkshopBookingStatus = (typeof workshopBookingStatuses)[number];

export type WorkshopBookingInput = {
  workshopId: string;
  workshopName: string;
  fullName: string;
  mobile: string;
  email?: string;
  date: string;
  participants: number;
  notes?: string;
};

export type ValidatedWorkshopBooking = WorkshopBookingInput & { email: string; notes: string };
export type WorkshopBookingListItem = ValidatedWorkshopBooking & {
  id: string;
  status: WorkshopBookingStatus;
  createdAt: string;
  updatedAt: string;
};
```

`parseWorkshopBookingInput` must trim text, normalize mobile punctuation, convert absent optional strings to `""`, enforce the canonical id/name pair, require tomorrow or later in local calendar terms, enforce participants as an integer of at least 1, cap name at 120, mobile at 20 normalized characters, email at 254, and notes at 1000. Preserve the existing form-facing `parseWorkshopBooking` by delegating its normalized payload to the new parser.

Add `parseWorkshopBookingStatus(input: unknown)` using the explicit status allowlist.

- [ ] **Step 4: Add the forward-only migration**

Create the exact table and indexes:

```sql
CREATE TABLE IF NOT EXISTS public.workshop_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id text NOT NULL,
  workshop_name text NOT NULL CHECK (char_length(workshop_name) BETWEEN 2 AND 120),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  mobile text NOT NULL CHECK (char_length(mobile) BETWEEN 7 AND 20),
  email text NOT NULL DEFAULT '' CHECK (char_length(email) <= 254),
  workshop_date date NOT NULL,
  participants integer NOT NULL CHECK (participants >= 1),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'completed', 'cancelled')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workshop_bookings_created_at_idx
  ON public.workshop_bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS workshop_bookings_status_idx
  ON public.workshop_bookings (status);
CREATE INDEX IF NOT EXISTS workshop_bookings_workshop_id_idx
  ON public.workshop_bookings (workshop_id);
```

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- src/features/workshop-booking/workshop-booking.test.ts`

Expected: PASS.

```powershell
git add db/migrations/002_create_workshop_bookings.sql src/features/workshop-booking/workshop-booking.ts src/features/workshop-booking/workshop-booking.test.ts
git commit -m "feat: model workshop booking requests"
```

### Task 2: Repository, service, and public submission boundary

**Files:**
- Create: `src/features/workshop-booking/workshop-booking-repository.server.ts`
- Create: `src/features/workshop-booking/workshop-booking-repository.server.test.ts`
- Create: `src/features/workshop-booking/workshop-booking-service.ts`
- Create: `src/features/workshop-booking/workshop-booking-service.test.ts`
- Create: `src/features/workshop-booking/workshop-booking.functions.ts`

**Interfaces:**
- Consumes: `ValidatedWorkshopBooking`, `WorkshopBookingInput`, `WorkshopBookingListItem`, and `WorkshopBookingStatus` from Task 1.
- Produces: `WorkshopBookingRepository.create/list/updateStatus`, `getNeonWorkshopBookingRepository()`, `submitWorkshopBookingRequest(input, repository)`, and `submitWorkshopBooking`.

- [ ] **Step 1: Write failing repository tests**

Use an injected `QueryExecutor` and assert query parameters and row mapping:

```ts
const execute = vi.fn<QueryExecutor>().mockResolvedValue([{ id: "workshop-booking-1" }]);
await expect(createWorkshopBookingRepository(execute).create(validatedBooking)).resolves.toEqual({
  id: "workshop-booking-1",
});
expect(execute).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO public.workshop_bookings"), [
  "mini-course",
  "Private mini course",
  "Noor Al-Hashemi",
  "+970591234567",
  "noor@example.com",
  "2026-07-13",
  3,
  "Vegetarian lunch",
]);
```

Add list mapping for snake_case columns and update coverage asserting:

```ts
await repository.updateStatus("workshop-booking-1", "confirmed");
expect(execute).toHaveBeenCalledWith(expect.stringContaining("updated_at = now()"), [
  "workshop-booking-1",
  "confirmed",
]);
```

The update test must also cover zero returned rows as `{ success: false, reason: "not-found" }`.

- [ ] **Step 2: Run repository tests and verify failure**

Run: `npm test -- src/features/workshop-booking/workshop-booking-repository.server.test.ts`

Expected: FAIL because the repository module does not exist.

- [ ] **Step 3: Implement parameterized repository methods**

Expose:

```ts
export type WorkshopBookingRepository = {
  create(booking: ValidatedWorkshopBooking): Promise<{ id: string }>;
  list(): Promise<WorkshopBookingListItem[]>;
  updateStatus(
    id: string,
    status: WorkshopBookingStatus,
  ): Promise<
    | { success: true; booking: WorkshopBookingListItem }
    | { success: false; reason: "not-found" }
  >;
};
```

Use `RETURNING` for create/update, order lists by `created_at DESC`, keep `DATABASE_URL` access inside `getNeonWorkshopBookingRepository`, and reuse the executor pattern from `booking-repository.server.ts`.

- [ ] **Step 4: Write failing service tests**

Cover validation, repository success, and caught storage errors:

```ts
await expect(submitWorkshopBookingRequest(validInput, { create })).resolves.toEqual({
  success: true,
  bookingId: "workshop-booking-1",
});
expect(create).toHaveBeenCalledWith(expect.objectContaining({ mobile: "+970591234567" }));

await expect(submitWorkshopBookingRequest({ ...validInput, participants: 0 }, { create })).resolves
  .toMatchObject({ success: false, reason: "validation" });

create.mockRejectedValueOnce(new Error("offline"));
await expect(submitWorkshopBookingRequest(validInput, { create })).resolves.toEqual({
  success: false,
  reason: "storage-error",
});
```

- [ ] **Step 5: Implement service and public server function**

The service result is:

```ts
export type WorkshopBookingSubmissionResult =
  | { success: true; bookingId: string }
  | { success: false; reason: "validation"; fieldErrors: Record<string, string | undefined> }
  | { success: false; reason: "storage-error" };
```

`submitWorkshopBooking` uses `createServerFn({ method: "POST" })`, validates the runtime payload through the domain parser/service, and requires no admin token.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- src/features/workshop-booking/workshop-booking-repository.server.test.ts src/features/workshop-booking/workshop-booking-service.test.ts`

Expected: PASS.

```powershell
git add src/features/workshop-booking/workshop-booking-repository.server.ts src/features/workshop-booking/workshop-booking-repository.server.test.ts src/features/workshop-booking/workshop-booking-service.ts src/features/workshop-booking/workshop-booking-service.test.ts src/features/workshop-booking/workshop-booking.functions.ts
git commit -m "feat: persist workshop booking requests"
```

### Task 3: Connect the customer dialog to real persistence

**Files:**
- Modify: `src/features/workshop-booking/workshop-booking-dialog.tsx`
- Modify: `src/features/workshop-booking/workshop-booking-dialog.test.tsx`
- Modify: `src/routes/workshops.tsx`

**Interfaces:**
- Consumes: `submitWorkshopBooking({ data: WorkshopBookingInput })` from Task 2 and canonical `workshopOptions` from Task 1.
- Produces: async dialog submission with preserved values, success confirmation, and retryable failure state.

- [ ] **Step 1: Replace demo tests with failing async submission tests**

Mock the submission module and verify the real states:

```ts
vi.mock("./workshop-booking.functions", () => ({
  submitWorkshopBooking: vi.fn(),
}));

it("shows a real confirmation after persistence succeeds", async () => {
  vi.mocked(submitWorkshopBooking).mockResolvedValue({
    success: true,
    bookingId: "workshop-booking-1",
  });
  fillValidForm();
  fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Your workshop request was sent");
});

it("preserves values and allows retry after storage failure", async () => {
  vi.mocked(submitWorkshopBooking).mockResolvedValue({ success: false, reason: "storage-error" });
  fillValidForm();
  fireEvent.click(screen.getByRole("button", { name: "Send booking request" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("We could not send your request");
  expect(screen.getByLabelText("Full name")).toHaveValue("Noor Al-Hashemi");
});
```

Also assert the button becomes disabled while a deferred promise is unresolved.

- [ ] **Step 2: Run the dialog test and verify failure**

Run: `npm test -- src/features/workshop-booking/workshop-booking-dialog.test.tsx`

Expected: FAIL because the dialog still shows demo confirmation and never calls the server function.

- [ ] **Step 3: Implement async dialog states**

Make `handleSubmit` async. Add `submitting` and `submissionError` state. Call:

```ts
const result = await submitWorkshopBooking({ data: parsed.data });
if (result.success) {
  setSubmitted(true);
} else if (result.reason === "validation") {
  setErrors(result.fieldErrors);
} else {
  setSubmissionError("We could not send your request. Please try again.");
}
```

Rename the action to `Send booking request`, show `Sending…` while disabled, replace all demo wording with an accurate delivery confirmation, and clear submission state only when closing. Import the three workshop choices in `workshops.tsx` from the canonical `workshopOptions` instead of maintaining a second id/name list.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- src/features/workshop-booking/workshop-booking-dialog.test.tsx src/features/workshop-booking/workshop-booking.test.ts`

Expected: PASS.

```powershell
git add src/features/workshop-booking/workshop-booking-dialog.tsx src/features/workshop-booking/workshop-booking-dialog.test.tsx src/routes/workshops.tsx
git commit -m "feat: submit workshop bookings from website"
```

### Task 4: Authenticated admin API and dashboard table

**Files:**
- Modify: `src/features/auth/admin.functions.ts`
- Create: `src/features/dashboard/dashboard-workshop-bookings.tsx`
- Create: `src/features/dashboard/dashboard-workshop-bookings.test.tsx`
- Create: `src/routes/dashboard/workshop-bookings.tsx`

**Interfaces:**
- Consumes: repository `list/updateStatus`, admin `verifyAdminToken`, and `WorkshopBookingListItem`.
- Produces: `getWorkshopBookings`, `updateWorkshopBookingStatus`, `filterWorkshopBookings`, and `DashboardWorkshopBookings`.

- [ ] **Step 1: Add failing server-function behavior tests at the helper boundary**

Write tests that import these new testable handlers from `admin.functions.ts`:

```ts
const dependencies = {
  verifyAdminToken: vi.fn().mockResolvedValue({ allowed: false }),
  repository: { list: vi.fn(), updateStatus: vi.fn() },
};
await expect(listWorkshopBookingsForAdmin("invalid-token", dependencies)).resolves.toEqual({
  success: false,
  reason: "forbidden",
});
expect(dependencies.repository.list).not.toHaveBeenCalled();
```

Tests must assert forbidden tokens do not call the repository, valid listing returns rows, invalid status returns `invalid-status`, missing ids return `not-found`, and repository exceptions become `load-error` or `update-error`.

- [ ] **Step 2: Implement authenticated admin functions**

Add handlers with the exact signatures:

```ts
export async function listWorkshopBookingsForAdmin(
  token: string,
  dependencies = { verifyAdminToken, repository: getNeonWorkshopBookingRepository() },
): Promise<
  | { success: true; bookings: WorkshopBookingListItem[] }
  | { success: false; reason: "forbidden" | "load-error" }
>;

export async function changeWorkshopBookingStatusForAdmin(
  input: { token: string; id: string; status: unknown },
  dependencies = { verifyAdminToken, repository: getNeonWorkshopBookingRepository() },
): Promise<
  | { success: true; booking: WorkshopBookingListItem }
  | { success: false; reason: "forbidden" | "invalid-status" | "not-found" | "update-error" }
>;
```

Expose server functions with Zod validators:

```ts
export const getWorkshopBookings = createServerFn({ method: "POST" })
  .validator(tokenSchema)
  .handler(({ data }) => listWorkshopBookingsForAdmin(data.token));

export const updateWorkshopBookingStatus = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), id: z.string().uuid(), status: z.unknown() }))
  .handler(({ data }) => changeWorkshopBookingStatusForAdmin(data));
```

Always verify access before parsing/updating protected state, and never pass an unvalidated status to the repository.

- [ ] **Step 3: Write failing component tests**

Use two realistic bookings and cover search, both filters, responsive markup, empty state, and status changes:

```ts
render(<DashboardWorkshopBookings bookings={bookings} onStatusChange={onStatusChange} />);
fireEvent.change(screen.getByLabelText("Search workshop bookings"), {
  target: { value: "noor@example.com" },
});
expect(screen.getAllByText("Noor Al-Hashemi").length).toBeGreaterThan(0);
expect(screen.queryByText("Layan Mansour")).toBeNull();

fireEvent.change(screen.getByLabelText("Status for Noor Al-Hashemi"), {
  target: { value: "confirmed" },
});
expect(onStatusChange).toHaveBeenCalledWith("workshop-booking-1", "confirmed");
```

The update failure test passes `updatingId` and `updateError`, verifies the selector is disabled while updating, and verifies an alert is rendered without replacing the row's prior status.

- [ ] **Step 4: Implement the responsive dashboard component**

Define filters as:

```ts
export type WorkshopBookingFilters = {
  query: string;
  workshopId: string | "all";
  status: WorkshopBookingStatus | "all";
};
```

`filterWorkshopBookings` searches normalized lowercase name/mobile/email and applies both selects. Render a semantic desktop table from `md` upward and stacked `<article>` rows below `md`. Use existing dashboard surface/button conventions, `DashboardEmptyState`, `StatusBadge` where compatible, and a native status `<select>` with a specific accessible label per customer.

- [ ] **Step 5: Implement the authenticated route**

The route reads the existing Neon auth session and JWT, then calls `getWorkshopBookings`. Keep local `bookings`, `loading`, `error`, `updatingId`, and `updateError` state. Status changes call `updateWorkshopBookingStatus` and replace only the server-returned row:

```ts
setBookings((current) =>
  current.map((booking) => (booking.id === result.booking.id ? result.booking : booking)),
);
```

Signed-out users get the existing sign-in link pattern; forbidden and load failures get distinct concise messages.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- src/features/auth/admin.functions.test.ts src/features/dashboard/dashboard-workshop-bookings.test.tsx`

Expected: PASS.

```powershell
git add src/features/auth/admin.functions.ts src/features/auth/admin.functions.test.ts src/features/dashboard/dashboard-workshop-bookings.tsx src/features/dashboard/dashboard-workshop-bookings.test.tsx src/routes/dashboard/workshop-bookings.tsx
git commit -m "feat: manage workshop bookings in dashboard"
```

### Task 5: Dashboard navigation and general-booking separation

**Files:**
- Modify: `src/features/dashboard/dashboard-shell.tsx`
- Modify: `src/features/dashboard/dashboard-shell.test.tsx`
- Modify: `src/features/dashboard/dashboard-bookings.tsx`
- Modify: `src/features/dashboard/dashboard-bookings.test.tsx`
- Modify (generated): `src/routeTree.gen.ts`

**Interfaces:**
- Consumes: `/dashboard/workshop-bookings` route from Task 4.
- Produces: discoverable navigation and a general appointment UI with no workshop type controls.

- [ ] **Step 1: Write failing navigation and separation tests**

Update the router mock pathname to `/dashboard/workshop-bookings` and assert:

```ts
expect(screen.getByRole("link", { name: "Workshop bookings" })).toHaveAttribute(
  "aria-current",
  "page",
);
expect(document.body.textContent).toContain("Workshop requests and participant details");
```

In the general bookings test assert:

```ts
expect(screen.queryByRole("option", { name: "Workshop" })).toBeNull();
fireEvent.click(screen.getByRole("button", { name: "New appointment" }));
expect(screen.queryByRole("option", { name: "Workshop" })).toBeNull();
```

Update helper fixtures so `filterAppointments` is tested only with appointment types supported by the general page.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- src/features/dashboard/dashboard-shell.test.tsx src/features/dashboard/dashboard-bookings.test.tsx`

Expected: FAIL because navigation and Workshop options still reflect the combined workflow.

- [ ] **Step 3: Implement navigation and separation**

Add a sidebar item using an existing Lucide calendar/list icon, plus:

```ts
pageTitles["/dashboard/workshop-bookings"] = "Workshop bookings";
pageDescriptions["/dashboard/workshop-bookings"] =
  "Workshop requests and participant details";
```

Remove `Workshop` from the general booking type filter and new/edit form. Narrow the form type to `"design"` if `BookingType` still includes workshop for demo overview compatibility; do not refactor unrelated dashboard model data.

- [ ] **Step 4: Regenerate the TanStack route tree**

Run: `npm run build`

Expected: the build succeeds and `src/routeTree.gen.ts` contains `/dashboard/workshop-bookings` imports, route types, and child registration.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- src/features/dashboard/dashboard-shell.test.tsx src/features/dashboard/dashboard-bookings.test.tsx`

Expected: PASS.

```powershell
git add src/features/dashboard/dashboard-shell.tsx src/features/dashboard/dashboard-shell.test.tsx src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx src/routeTree.gen.ts
git commit -m "feat: separate workshop and appointment bookings"
```

### Task 6: Migration application and end-to-end verification

**Files:**
- Verify only; modify implementation files only if a check exposes a feature-specific defect.

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: verified build and live Neon schema readiness.

- [ ] **Step 1: Apply the migration to the configured Neon database**

Use the project's configured `DATABASE_URL` without printing it. Execute `db/migrations/002_create_workshop_bookings.sql` through the Neon SQL client or approved project database workflow.

Expected: table and all three indexes are created idempotently. If no database credential is configured locally, report the exact migration path as the only deployment prerequisite; do not claim live persistence is ready.

- [ ] **Step 2: Run all automated verification**

```powershell
npm test
npm run lint
npm run build
node scripts/verify-workshops-page.mjs
node scripts/verify-dashboard.mjs
git diff --check
```

Expected: every command exits 0, all tests pass, and no whitespace errors are reported.

- [ ] **Step 3: Perform browser verification**

Run `npm run dev`, then verify:

1. `/workshops` opens each workshop dialog with the correct canonical workshop.
2. A valid request shows a loading state, then a real success message.
3. A storage failure preserves inputs and shows the retry message.
4. `/dashboard/workshop-bookings` requires admin auth.
5. The submitted row shows every captured field.
6. Search and workshop/status filters narrow the rows correctly.
7. Status changes persist after a page refresh.
8. The mobile layout has no page-level horizontal overflow.
9. `/dashboard/bookings` contains no Workshop filter or form option.

- [ ] **Step 4: Review the final diff**

Run: `git status --short` and `git diff --stat HEAD~4..HEAD`.

Expected: only feature files and the pre-existing unrelated user changes are present. If a check exposed a defect, return to the owning task, add a regression test, make the minimal fix, rerun that task's focused command, and repeat the full verification sequence. Do not stage or commit unrelated pre-existing changes.
