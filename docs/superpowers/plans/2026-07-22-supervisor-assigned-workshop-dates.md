# Supervisor-Assigned Workshop Dates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove customer date selection from the first two workshops, keep it required for the final workshop, and let supervisors assign dates later from the existing dashboard.

**Architecture:** Put the workshop/date ownership rule in the workshop-booking domain module so client and server validation share one decision. Persist an unassigned date as SQL `NULL`, map it to domain `null`, and keep status updates independent. The dashboard renders the unset state and sends a nullable date through its existing authenticated edit path.

**Tech Stack:** React 19, TypeScript, TanStack Start server functions, Zod, PostgreSQL/Neon, Vitest, Testing Library.

## Global Constraints

- `pattern-foundation` and `mini-course` customer submissions always normalize to `date: null`.
- `corset-workshop` customer submissions require a valid date after today.
- A supervisor may confirm either of the first two workshops while its date is unset.
- Existing migration files are immutable; use a new forward-only migration.
- Never use an empty string or sentinel date in persisted data.
- Do not stage or alter the user's existing changes in `package.json`, `package-lock.json`, `vite.config.ts`, or `src/test/vite-config.test.ts`.

---

## File Structure

- `db/migrations/008_allow_unassigned_workshop_dates.sql`: make dates nullable while keeping a database invariant that the corset workshop has a date.
- `src/features/workshop-booking/workshop-booking.ts`: own workshop ID types, date-ownership rules, nullable date types, and validation.
- `src/features/workshop-booking/workshop-booking.test.ts`: prove customer and supervisor date rules.
- `src/features/workshop-booking/workshop-booking-repository.server.ts`: persist and map SQL `NULL` dates.
- `src/features/workshop-booking/workshop-booking-repository.server.test.ts`: prove nullable insert, list, and update behavior.
- `src/features/workshop-booking/workshop-booking-dialog.tsx`: conditionally render the customer date field.
- `src/features/workshop-booking/workshop-booking-dialog.test.tsx`: prove first-two/final-workshop UI and submissions.
- `src/features/dashboard/dashboard-workshop-bookings.tsx`: render `Not set`, edit nullable dates, and build safe reminders.
- `src/features/dashboard/dashboard-workshop-bookings.test.tsx`: prove unset-date display, edits, reminders, and status independence.
- `src/features/auth/admin.functions.test.ts`: prove the authenticated edit path forwards a nullable validated date.

### Task 1: Domain Rules and Forward-Only Migration

**Files:**
- Create: `db/migrations/008_allow_unassigned_workshop_dates.sql`
- Modify: `src/features/workshop-booking/workshop-booking.ts`
- Test: `src/features/workshop-booking/workshop-booking.test.ts`

**Interfaces:**
- Produces: `WorkshopId`, `customerSelectsWorkshopDate(workshopId: string): boolean`, `ValidatedWorkshopBooking.date: string | null`, and `WorkshopBookingAdminUpdateInput` with `workshopId: WorkshopId` and `date: string | null`.
- Consumes: the three existing entries in `workshopOptions` and the calendar-date helpers.

- [ ] **Step 1: Write failing customer and admin domain tests**

```ts
it.each([
  ["pattern-foundation", "Pattern foundation"],
  ["mini-course", "Private mini course"],
])("normalizes a customer date to null for %s", (workshopId, workshopName) => {
  expect(parseWorkshopBookingInput(
    { ...validInput, workshopId, workshopName, date: "2026-08-20" },
    new Date(2026, 6, 12, 8),
  )).toMatchObject({ success: true, data: { date: null } });
});

it("requires a future customer date for the corset workshop", () => {
  expect(parseWorkshopBookingInput(
    { ...validInput, workshopId: "corset-workshop", workshopName: "One-day corset workshop", date: null },
    new Date(2026, 6, 12, 8),
  )).toMatchObject({ success: false, errors: { date: "Choose a workshop date." } });
});

it("accepts an unset supervisor date for a supervisor-assigned workshop", () => {
  expect(parseWorkshopBookingAdminUpdate({ ...validAdminInput, workshopId: "mini-course", date: null }))
    .toMatchObject({ success: true, data: { workshopId: "mini-course", date: null } });
});

it("requires a supervisor date for the corset workshop", () => {
  expect(parseWorkshopBookingAdminUpdate({ ...validAdminInput, workshopId: "corset-workshop", date: null }))
    .toMatchObject({ success: false, errors: { date: "Choose a workshop date." } });
});
```

Update existing normalization assertions so the first two workshops expect `date: null`, and move future-date acceptance cases to a `corset-workshop` fixture.

- [ ] **Step 2: Run the domain tests and verify RED**

```powershell
npm test -- src/features/workshop-booking/workshop-booking.test.ts
```

Expected: FAIL because nullable dates and workshop-specific ownership are not implemented.

- [ ] **Step 3: Implement the minimal domain rule**

```ts
export type WorkshopId = (typeof workshopOptions)[number]["id"];

export function customerSelectsWorkshopDate(workshopId: string) {
  return workshopId === "corset-workshop";
}
```

Change input schemas to accept `date: z.string().nullable().optional()`. Keep `WorkshopBookingFormValues.date` as a string for the native input, and define persisted/admin values as nullable:

```ts
export type WorkshopBookingInput = {
  workshopId: string;
  workshopName: string;
  fullName: string;
  mobile: string;
  email?: string;
  date?: string | null;
  participants: number;
  notes?: string;
};

export type ValidatedWorkshopBooking = Omit<WorkshopBookingInput, "date" | "email" | "notes"> & {
  date: string | null;
  email: string;
  notes: string;
};

export type WorkshopBookingAdminUpdateInput = {
  workshopId: WorkshopId;
  fullName: string;
  mobile: string;
  email: string;
  date: string | null;
  participants: number;
};
```

Normalize the customer date after validating the ID/name pair:

```ts
const suppliedDate = parsed.data.date?.trim() || null;
const date = customerSelectsWorkshopDate(workshopId) ? suppliedDate : null;

if (customerSelectsWorkshopDate(workshopId)) {
  if (!date || !isCalendarDate(date)) errors.date = "Choose a workshop date.";
  else if (date < getTomorrowDateMinimum(today)) errors.date = "Choose a date after today.";
}
```

In admin parsing, validate `workshopId` against `workshopOptions`, accept `null` for the first two workshops, require a valid calendar date for `corset-workshop`, and return normalized `workshopId` and `date`.

- [ ] **Step 4: Add the nullable-date migration**

```sql
ALTER TABLE public.workshop_bookings
  ALTER COLUMN workshop_date DROP NOT NULL;

ALTER TABLE public.workshop_bookings
  ADD CONSTRAINT workshop_bookings_corset_date_required
  CHECK (workshop_id <> 'corset-workshop' OR workshop_date IS NOT NULL);
```

- [ ] **Step 5: Run domain tests and verify GREEN**

```powershell
npm test -- src/features/workshop-booking/workshop-booking.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1 files only**

```powershell
git add -- db/migrations/008_allow_unassigned_workshop_dates.sql src/features/workshop-booking/workshop-booking.ts src/features/workshop-booking/workshop-booking.test.ts
git commit -m "feat: add workshop-specific date ownership"
```

### Task 2: Nullable Repository Persistence

**Files:**
- Modify: `src/features/workshop-booking/workshop-booking-repository.server.ts`
- Test: `src/features/workshop-booking/workshop-booking-repository.server.test.ts`

**Interfaces:**
- Consumes: nullable domain/admin dates from Task 1.
- Produces: `WorkshopBookingListItem.date: string | null` mapped from SQL.

- [ ] **Step 1: Write failing nullable repository tests**

Change the mini-course fixture and SQL row to `date: null`/`workshop_date: null`. Assert create and update calls forward `null`:

```ts
expect(execute).toHaveBeenCalledWith(
  expect.stringContaining("INSERT INTO public.workshop_bookings"),
  ["mini-course", "Private mini course", "Noor Al-Hashemi", "+970591234567", "noor@example.com", null, 3, "Vegetarian lunch"],
);
expect(mappedWorkshopBooking.date).toBeNull();
```

Add `workshopId: "mini-course"` to `updateInput`, set its date to `null`, and expect `null` at the update query's date parameter.

- [ ] **Step 2: Run repository tests and verify RED**

```powershell
npm test -- src/features/workshop-booking/workshop-booking-repository.server.test.ts
```

Expected: FAIL with type or mapping mismatches.

- [ ] **Step 3: Implement nullable row mapping**

```ts
type WorkshopBookingRow = {
  // retain existing columns
  workshop_date: string | null;
};
```

Keep `booking.date` and `input.date` as bound parameters. The existing mapper passes SQL `NULL` through as domain `null`. Do not include `workshopId` in the editable SQL columns.

- [ ] **Step 4: Run repository tests and verify GREEN**

```powershell
npm test -- src/features/workshop-booking/workshop-booking-repository.server.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2 files only**

```powershell
git add -- src/features/workshop-booking/workshop-booking-repository.server.ts src/features/workshop-booking/workshop-booking-repository.server.test.ts
git commit -m "feat: persist unassigned workshop dates"
```

### Task 3: Customer Booking Dialog

**Files:**
- Modify: `src/features/workshop-booking/workshop-booking-dialog.tsx`
- Test: `src/features/workshop-booking/workshop-booking-dialog.test.tsx`

**Interfaces:**
- Consumes: `customerSelectsWorkshopDate(workshopId)` from Task 1.
- Produces: customer requests with `date: null` for the first two workshops or a required future date for the final workshop.

- [ ] **Step 1: Write failing visibility and submission tests**

```ts
const miniCourse = { id: "mini-course", name: "Private mini course" };
const corsetWorkshop = { id: "corset-workshop", name: "One-day corset workshop" };

it("does not ask for a date on either supervisor-assigned workshop", () => {
  const { rerender } = render(<WorkshopBookingDialog workshop={miniCourse} onOpenChange={() => undefined} />);
  expect(screen.queryByLabelText("Workshop date")).toBeNull();
  rerender(<WorkshopBookingDialog workshop={{ id: "pattern-foundation", name: "Pattern foundation" }} onOpenChange={() => undefined} />);
  expect(screen.queryByLabelText("Workshop date")).toBeNull();
});

it("requires a date on the corset workshop", () => {
  render(<WorkshopBookingDialog workshop={corsetWorkshop} onOpenChange={() => undefined} />);
  expect(screen.getByLabelText("Workshop date")).toBeTruthy();
});
```

Update mini-course submission helpers so they do not query a date and assert `date: null`. Add a corset submission case that fills and submits the date.

- [ ] **Step 2: Run dialog tests and verify RED**

```powershell
npm test -- src/features/workshop-booking/workshop-booking-dialog.test.tsx
```

Expected: FAIL because the date input is shown for every workshop.

- [ ] **Step 3: Render the date field conditionally**

```ts
const customerChoosesDate = customerSelectsWorkshopDate(workshop?.id ?? "");
```

Wrap the existing date `Field` in `{customerChoosesDate ? (...) : null}`. Leave its label, `type="date"`, minimum, direction, and styling unchanged. Keep `initialValues.date` as `""`; domain parsing normalizes it to `null` for the first two workshops.

- [ ] **Step 4: Run dialog and domain tests and verify GREEN**

```powershell
npm test -- src/features/workshop-booking/workshop-booking-dialog.test.tsx src/features/workshop-booking/workshop-booking.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3 files only**

```powershell
git add -- src/features/workshop-booking/workshop-booking-dialog.tsx src/features/workshop-booking/workshop-booking-dialog.test.tsx
git commit -m "feat: hide customer dates for private workshops"
```

### Task 4: Supervisor Dashboard and Authenticated Edit Flow

**Files:**
- Modify: `src/features/dashboard/dashboard-workshop-bookings.tsx`
- Test: `src/features/dashboard/dashboard-workshop-bookings.test.tsx`
- Test: `src/features/auth/admin.functions.test.ts`

**Interfaces:**
- Consumes: nullable list/admin date types from Task 1.
- Produces: `Not set` display, nullable edit payloads, safe reminders, and unchanged date-independent status updates.

- [ ] **Step 1: Write failing dashboard tests**

Set the mini-course fixture date to `null`, then assert:

```ts
expect(screen.getAllByText("Not set").length).toBe(2);
const href = screen.getAllByLabelText("Send reminder to Noor Al-Hashemi")[0].getAttribute("href")!;
expect(decodeURIComponent(href)).toContain("Private mini course workshop.");
expect(decodeURIComponent(href)).not.toContain(" on null");

fireEvent.click(screen.getAllByLabelText("Edit Noor Al-Hashemi")[0]);
expect(screen.getByLabelText("Date")).toHaveProperty("value", "");
fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
expect(onEdit).toHaveBeenCalledWith("workshop-booking-1", expect.objectContaining({
  workshopId: "mini-course",
  date: null,
}));
```

Keep the existing status-change test on this null-dated booking to prove confirmation independence.

- [ ] **Step 2: Write the failing authenticated admin test**

Add `workshopId: "mini-course"` to `workshopUpdateInput` and add:

```ts
it("forwards an unset date for a supervisor-assigned workshop", async () => {
  const testDependencies = dependencies();
  await updateWorkshopBookingForAdmin(
    { token: "admin-token", id: booking.id, input: { ...workshopUpdateInput, date: null } },
    testDependencies,
  );
  expect(testDependencies.repository.update).toHaveBeenCalledWith(
    booking.id,
    expect.objectContaining({ workshopId: "mini-course", date: null }),
  );
});
```

- [ ] **Step 3: Run dashboard and admin tests and verify RED**

```powershell
npm test -- src/features/dashboard/dashboard-workshop-bookings.test.tsx src/features/auth/admin.functions.test.ts
```

Expected: FAIL because `null` is rendered/interpolated and the edit form requires a date.

- [ ] **Step 4: Implement display and safe reminders**

```ts
const dateClause = booking.date ? ` on ${booking.date}` : "";
const reminderMessage = `Hi ${booking.fullName}, this is a reminder for your ${booking.workshopName} workshop${dateClause}.`;
```

Render both desktop and mobile date cells as `{booking.date ?? "Not set"}`.

- [ ] **Step 5: Implement the nullable edit form**

```ts
type WorkshopBookingEditForm = Omit<WorkshopBookingAdminUpdateInput, "date"> & { date: string };

const input: WorkshopBookingAdminUpdateInput = {
  ...editForm,
  workshopId: editingBooking.workshopId as WorkshopBookingAdminUpdateInput["workshopId"],
  fullName: editForm.fullName.trim(),
  mobile: editForm.mobile.trim(),
  email: editForm.email.trim(),
  date: editForm.date || null,
  participants: Number(editForm.participants),
};
```

Initialize the controlled date with `booking.date ?? ""`. Require a non-empty date in both the client check and native input only when `editingBooking.workshopId === "corset-workshop"`.

- [ ] **Step 6: Run dashboard and admin tests and verify GREEN**

```powershell
npm test -- src/features/dashboard/dashboard-workshop-bookings.test.tsx src/features/auth/admin.functions.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4 files only**

```powershell
git add -- src/features/dashboard/dashboard-workshop-bookings.tsx src/features/dashboard/dashboard-workshop-bookings.test.tsx src/features/auth/admin.functions.test.ts
git commit -m "feat: manage unassigned dates in workshop dashboard"
```

### Task 5: Full Verification

**Files:**
- Verify all files changed in Tasks 1-4.

**Interfaces:**
- Consumes: the completed end-to-end flow.
- Produces: test, lint, build, and repository-state evidence.

- [ ] **Step 1: Run focused tests**

```powershell
npm test -- src/features/workshop-booking/workshop-booking.test.ts src/features/workshop-booking/workshop-booking-repository.server.test.ts src/features/workshop-booking/workshop-booking-dialog.test.tsx src/features/dashboard/dashboard-workshop-bookings.test.tsx src/features/auth/admin.functions.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the complete suite**

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 3: Run lint**

```powershell
npm run lint
```

Expected: exit code 0. If unrelated pre-existing findings appear, record their exact files and confirm no task file adds a finding.

- [ ] **Step 4: Run the production build**

```powershell
npm run build
```

Expected: PASS with client and server bundles.

- [ ] **Step 5: Inspect repository state**

```powershell
git status --short
git log -6 --oneline --decorate
```

Expected: only the user's pre-existing unstaged changes remain; feature files are committed in focused commits.
