# Workshop Booking Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reminder, WhatsApp, edit, and delete actions to each dashboard workshop booking.

**Architecture:** Extend the workshop-booking domain with a narrowly scoped admin-update parser, then expose parameterized repository and authenticated server-function mutations. The route owns async mutation state; the dashboard component owns the edit and confirmation dialogs and presents a bookings-table-style icon action group.

**Tech Stack:** React 19, TypeScript, TanStack Start, Zod, Neon Postgres, Radix AlertDialog/Dialog, Lucide React, Vitest, Testing Library.

## Global Constraints

- Keep `Update status` as the sole status-editing control; the `Actions` column must not change booking status.
- Edit only `fullName`, `mobile`, `email`, `date`, and `participants`; do not expose workshop, notes, or status in the edit dialog.
- Reminder and normal messaging both open WhatsApp; the reminder URL includes customer name, workshop name, and date.
- Use parameterized SQL, admin-token verification before repository resolution, and no database migration.
- Do not stage or commit unrelated existing worktree changes.

---

## File structure

- `src/features/workshop-booking/workshop-booking.ts`: admin-update input type and validation parser.
- `src/features/workshop-booking/workshop-booking-repository.server.ts`: edit/delete repository interface and Neon queries.
- `src/features/workshop-booking/workshop-booking-repository.server.test.ts`: repository mutation coverage.
- `src/features/auth/admin.functions.ts`: authorized workshop update/delete server functions.
- `src/features/auth/admin.functions.test.ts`: authorization, validation, and failure mapping coverage.
- `src/routes/dashboard/workshop-bookings.tsx`: client-side mutation state and callbacks.
- `src/features/dashboard/dashboard-workshop-bookings.tsx`: action column plus edit/delete UI.
- `src/features/dashboard/dashboard-workshop-bookings.test.tsx`: action links, dialog behavior, and disabled/error states.

### Task 1: Validate and persist workshop booking edits and deletion

**Files:**
- Modify: `src/features/workshop-booking/workshop-booking.ts`
- Modify: `src/features/workshop-booking/workshop-booking-repository.server.ts`
- Test: `src/features/workshop-booking/workshop-booking-repository.server.test.ts`

**Interfaces:**
- Produces `WorkshopBookingAdminUpdateInput`, `parseWorkshopBookingAdminUpdate(input)`, `WorkshopBookingRepository.update(id, input)`, and `WorkshopBookingRepository.delete(id)`.
- `update` returns `{ success: true; booking: WorkshopBookingListItem } | { success: false; reason: "not-found" }`.
- `delete` returns `{ success: true } | { success: false; reason: "not-found" }`.

- [ ] **Step 1: Write failing repository tests for edit and delete**

  Add tests that call `repository.update("workshop-booking-1", updateInput)` and `repository.delete("workshop-booking-1")`, asserting these parameter arrays:

  ```ts
  const updateInput = {
    fullName: "Noor Khalil",
    mobile: "+970591234567",
    email: "noor@example.com",
    date: "2026-07-13",
    participants: 4,
  };

  expect(execute).toHaveBeenCalledWith(expect.stringContaining("UPDATE public.workshop_bookings"), [
    "workshop-booking-1", "Noor Khalil", "+970591234567", "noor@example.com", "2026-07-13", 4,
  ]);
  expect(execute).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM public.workshop_bookings"), [
    "workshop-booking-1",
  ]);
  ```

- [ ] **Step 2: Run the focused repository test to verify it fails**

  Run: `npm test -- src/features/workshop-booking/workshop-booking-repository.server.test.ts`

  Expected: FAIL because `update` and `delete` are absent from `WorkshopBookingRepository`.

- [ ] **Step 3: Add the update input parser and repository methods**

  In `workshop-booking.ts`, add the input type and a parser that trims fields, normalizes mobile, accepts a valid calendar date (including historic dates), and uses the existing limits for full name, mobile, email, and integer participants:

  ```ts
  export type WorkshopBookingAdminUpdateInput = {
    fullName: string;
    mobile: string;
    email: string;
    date: string;
    participants: number;
  };

  export function parseWorkshopBookingAdminUpdate(input: unknown):
    | { success: true; data: WorkshopBookingAdminUpdateInput }
    | { success: false; errors: Pick<WorkshopBookingErrors, "fullName" | "mobile" | "email" | "date" | "participants"> };
  ```

  In the repository, add `updateWorkshopBookingQuery` with `full_name`, `mobile`, `email`, `workshop_date`, `participants`, and `updated_at = now()`, returning `workshopBookingColumns`; add `deleteWorkshopBookingQuery` with `RETURNING id`. Map a returned update row with the existing mapper and map an empty result to `not-found`.

- [ ] **Step 4: Run the focused repository test to verify it passes**

  Run: `npm test -- src/features/workshop-booking/workshop-booking-repository.server.test.ts`

  Expected: PASS, including existing create/list/status tests and the new edit/delete tests.

- [ ] **Step 5: Commit Task 1**

  ```powershell
  git add src/features/workshop-booking/workshop-booking.ts src/features/workshop-booking/workshop-booking-repository.server.ts src/features/workshop-booking/workshop-booking-repository.server.test.ts
  git commit -m "feat: persist workshop booking edits"
  ```

### Task 2: Add authenticated admin edit and delete mutations

**Files:**
- Modify: `src/features/auth/admin.functions.ts`
- Test: `src/features/auth/admin.functions.test.ts`

**Interfaces:**
- Consumes `parseWorkshopBookingAdminUpdate`, `WorkshopBookingRepository.update`, and `WorkshopBookingRepository.delete`.
- Produces `updateWorkshopBookingForAdmin`, `deleteWorkshopBookingForAdmin`, `updateWorkshopBooking`, and `deleteWorkshopBooking`.

- [ ] **Step 1: Write failing admin-function tests**

  Extend the workshop dependency fixture with `update` and `delete` mocks. Add assertions that an allowed token forwards a parsed update input to `repository.update`, a forbidden token calls neither method, malformed input returns `{ success: false, reason: "validation" }`, and a repository exception maps to `update-error` or `delete-error`.

  ```ts
  await expect(
    updateWorkshopBookingForAdmin({ token: "admin-token", id: booking.id, input: updateInput }, deps),
  ).resolves.toEqual({ success: true, booking: { ...booking, fullName: "Noor Khalil" } });
  expect(deps.repository.update).toHaveBeenCalledWith(booking.id, updateInput);
  ```

- [ ] **Step 2: Run the focused admin-functions test to verify it fails**

  Run: `npm test -- src/features/auth/admin.functions.test.ts`

  Expected: FAIL because the workshop edit/delete admin functions do not exist.

- [ ] **Step 3: Implement the two server-function boundaries**

  Expand `WorkshopBookingAdminDependencies` to pick `list | updateStatus | update | delete`. Implement these return contracts:

  ```ts
  export async function updateWorkshopBookingForAdmin(input: { token: string; id: string; input: unknown }, dependencies?: WorkshopBookingAdminDependencies): Promise<
    | { success: true; booking: WorkshopBookingListItem }
    | { success: false; reason: "forbidden" | "validation" | "not-found" | "update-error"; fieldErrors?: WorkshopBookingErrors }
  >;

  export async function deleteWorkshopBookingForAdmin(input: { token: string; id: string }, dependencies?: WorkshopBookingAdminDependencies): Promise<
    { success: true } | { success: false; reason: "forbidden" | "not-found" | "delete-error" }
  >;
  ```

  Verify the token before resolving the repository, parse edit input before calling `update`, then export `createServerFn({ method: "POST" })` wrappers validated with `{ token: z.string().min(1), id: z.string().uuid(), input: z.unknown() }` and `{ token: z.string().min(1), id: z.string().uuid() }`.

- [ ] **Step 4: Run the focused admin-functions test to verify it passes**

  Run: `npm test -- src/features/auth/admin.functions.test.ts`

  Expected: PASS, including forbidden, validation, not-found, and unexpected-storage-error paths.

- [ ] **Step 5: Commit Task 2**

  ```powershell
  git add src/features/auth/admin.functions.ts src/features/auth/admin.functions.test.ts
  git commit -m "feat: authorize workshop booking actions"
  ```

### Task 3: Render and test the workshop action UI

**Files:**
- Modify: `src/features/dashboard/dashboard-workshop-bookings.tsx`
- Test: `src/features/dashboard/dashboard-workshop-bookings.test.tsx`

**Interfaces:**
- Consumes `onEdit(id, input)`, `onDelete(id)`, `editingId`, `editError`, `deletingId`, and `deleteError` from the route.
- Produces an `Actions` desktop column and equivalent mobile controls.

- [ ] **Step 1: Write failing component tests**

  Add tests that assert:

  ```ts
  expect(screen.getByRole("columnheader", { name: "Actions" })).toBeTruthy();
  expect(screen.getByLabelText("Send reminder to Noor Al-Hashemi").getAttribute("href")).toContain("https://wa.me/970591234567?text=");
  expect(screen.getByLabelText("Message Noor Al-Hashemi on WhatsApp").getAttribute("href")).toBe("https://wa.me/970591234567");
  ```

  Also open `Edit Noor Al-Hashemi`, change `Participants` to `4`, submit, and assert `onEdit` receives only the five permitted fields. Open `Delete Noor Al-Hashemi`, cancel once, then confirm and assert `onDelete("workshop-booking-1")`. Cover disabled edit/delete buttons and page alerts for `editError` and `deleteError`.

- [ ] **Step 2: Run the focused component test to verify it fails**

  Run: `npm test -- src/features/dashboard/dashboard-workshop-bookings.test.tsx`

  Expected: FAIL because the action header, controls, and dialogs do not exist.

- [ ] **Step 3: Implement action controls and dialogs**

  Import `Bell`, `MessageCircle`, `Pencil`, `Trash2`, `Dialog`, and alert-dialog primitives. Add local `editingBooking` and `deletingBooking` state plus a five-field form state. Add optional `onEdit` and `onDelete` props with no-op defaults, plus `editingId`, `editError`, `deletingId`, and `deleteError` defaults, so the existing component tests retain valid call sites. Add an `Actions` header after `Update status`; each table cell uses the same bordered, divided compact icon group as `dashboard-bookings.tsx`.

  Use these exact URL and action shapes:

  ```ts
  const whatsappNumber = booking.mobile.replace(/\D/g, "");
  const reminderMessage = `Hi ${booking.fullName}, this is a reminder for your ${booking.workshopName} workshop on ${booking.date}.`;
  const reminderHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(reminderMessage)}`;
  const messageHref = `https://wa.me/${whatsappNumber}`;
  ```

  The edit dialog includes only Full name, Mobile, Email, Date, and Participants. On valid submit, convert participants with `Number()` and call `onEdit(editingBooking.id, input)`. The delete alert calls `onDelete(deletingBooking.id)` only from its confirmation action. Keep `StatusSelect` separate. Add labelled mobile buttons with the same semantics beneath each card.

- [ ] **Step 4: Run the focused component test to verify it passes**

  Run: `npm test -- src/features/dashboard/dashboard-workshop-bookings.test.tsx`

  Expected: PASS, including all existing filtering/status tests and new action coverage.

- [ ] **Step 5: Commit Task 3**

  ```powershell
  git add src/features/dashboard/dashboard-workshop-bookings.tsx src/features/dashboard/dashboard-workshop-bookings.test.tsx
  git commit -m "feat: add workshop booking actions"
  ```

### Task 4: Wire workshop mutation state into the dashboard route

**Files:**
- Modify: `src/routes/dashboard/workshop-bookings.tsx`

**Interfaces:**
- Consumes `updateWorkshopBooking`, `deleteWorkshopBooking`, and `WorkshopBookingAdminUpdateInput`.
- Produces `onEdit`, `onDelete`, `editingId`, `editError`, `deletingId`, and `deleteError` props for `DashboardWorkshopBookings`.

- [ ] **Step 1: Add route state and callbacks**

  Add four state values: `editingId`, `editError`, `deletingId`, and `deleteError`. Implement `handleEdit(id, input)` and `handleDelete(id)` following the existing `handleStatusChange` pattern: clear that action's error, obtain the JWT, invoke the matching server function, map `forbidden`, `not-found`, and fallback failures to user-facing messages, then replace or remove the local booking.

  ```ts
  setBookings((current) => current.filter((booking) => booking.id !== id));
  ```

- [ ] **Step 2: Pass the new action props to the component**

  ```tsx
  <DashboardWorkshopBookings
    bookings={bookings}
    onStatusChange={handleStatusChange}
    onEdit={handleEdit}
    editingId={editingId}
    editError={editError}
    onDelete={handleDelete}
    deletingId={deletingId}
    deleteError={deleteError}
    updatingId={updatingId}
    updateError={updateError}
  />
  ```

- [ ] **Step 3: Run static checks for the route integration**

  Run: `npm run lint`

  Expected: PASS with the new component props and route callbacks wired together.

- [ ] **Step 4: Commit Task 4**

  ```powershell
  git add src/routes/dashboard/workshop-bookings.tsx
  git commit -m "feat: wire workshop booking actions"
  ```

### Task 5: Full verification

**Files:**
- Modify: none unless verification reveals a defect.

- [ ] **Step 1: Run all relevant tests**

  Run: `npm test -- src/features/workshop-booking/workshop-booking-repository.server.test.ts src/features/auth/admin.functions.test.ts src/features/dashboard/dashboard-workshop-bookings.test.tsx`

  Expected: PASS with no failed test files.

- [ ] **Step 2: Run the project regression suite**

  Run: `npm test`

  Expected: PASS with all test files green.

- [ ] **Step 3: Run static and production checks**

  Run: `npm run lint`

  Expected: exit code 0 with no lint errors.

  Run: `npm run build`

  Expected: exit code 0 and a production bundle generated successfully.

- [ ] **Step 4: Inspect the final worktree before handoff**

  Run: `git status --short`

  Expected: only the planned files are staged/committed by this work; preserve unrelated pre-existing changes.

## Plan self-review

- **Spec coverage:** Task 1 implements persistence, Task 2 protects mutations, Task 3 updates local state, Task 4 implements all four actions plus dialog/error/disabled behavior, and Task 5 validates the full change.
- **Placeholder scan:** No deferred requirements or unspecified test cases remain.
- **Type consistency:** `WorkshopBookingAdminUpdateInput` flows from parser to repository, server function, route, and component; status mutation remains separate.
