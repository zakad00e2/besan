# Database-Backed Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Neon Postgres the only runtime source for dashboard design data, persist administrator-created and edited appointments, and limit appointment selection to canonical available slots.

**Architecture:** Keep route-owned loading through the existing authenticated booking projection. Add authenticated month/day availability projections that can exclude only the appointment being edited, then revalidate the selected slot server-side immediately before parameterized administrator create/update queries. Delete the demo provider/reducer and keep reusable sample data under test-only fixtures.

**Tech Stack:** TypeScript 5.8, React 19, TanStack Start/Router, Neon Serverless Postgres, Neon Auth, Zod, Vitest, Testing Library, React DayPicker via the existing `Calendar` component.

## Global Constraints

- Neon Postgres is the sole runtime source for dashboard design appointments and customers.
- Workshop bookings remain separate and do not affect `/dashboard` metrics or schedules.
- Administrator create/edit uses the same weekly schedule, date overrides, timezone, slot duration, current-time cutoff, and occupied-slot rules as public booking.
- The administrator cannot override closed, past, stale, or occupied slots.
- Public availability functions never accept an appointment exclusion.
- Database credentials, raw SQL errors, tokens, and provider responses never reach the browser.
- Do not introduce React Query or a dashboard-wide remote cache.
- Remove the temporary global reminder-preferences UI, but keep persisted per-booking reminder status and manual WhatsApp reminders.
- Preserve unrelated user changes in the dirty worktree. Stage only files named by the current task.
- Do not rewrite published Lovable history: no rebase, amend, squash, or force push.

---

## File Structure

- Create `src/test/fixtures/dashboard.ts`: test-only customer and appointment fixtures formerly supplied by runtime demo data.
- Create `src/features/dashboard/use-admin-booking-availability.ts`: authenticated, race-safe month/day availability controller for the administrator dialog.
- Create `src/features/dashboard/use-admin-booking-availability.test.tsx`: hook authorization, error, exclusion, and stale-response tests.
- Create `src/routes/-dashboard-index.test.tsx`: overview route live loading, retry, error, and empty-state tests.
- Create `src/test/dashboard-runtime-data-contract.test.ts`: prevents runtime demo/test-fixture imports.
- Modify `src/features/book-call/booking-domain.ts`: persisted customer timestamps and administrator create/update input/result contracts.
- Modify `src/features/book-call/booking-domain.test.ts`: administrator input validation tests.
- Modify `src/features/book-call/booking-repository.server.ts`: customer creation timestamp projection and parameterized administrator insert/update methods.
- Modify `src/features/book-call/booking-repository.server.test.ts`: projection, insert/update, not-found, and conflict tests.
- Modify `src/features/availability/availability-service.ts`: authenticated projections and optional internal occupied-appointment exclusion.
- Modify `src/features/availability/availability-service.test.ts`: authorization and edit-exclusion tests.
- Modify `src/features/availability/availability.functions.ts`: authenticated administrator month/day server functions.
- Modify `src/features/auth/admin.functions.ts`: authorized create/update orchestration and slot revalidation.
- Modify `src/features/auth/admin.functions.test.ts`: validation, authorization, availability, and repository outcome tests.
- Modify `src/features/dashboard/dashboard-model.ts`: add `Customer.createdAt`; remove legacy notes/activity/dashboard-state/reminder-settings types.
- Modify `src/features/dashboard/dashboard-model.test.ts`: persisted timestamp metric behavior and fixture imports.
- Modify `src/features/dashboard/dashboard-booking-data.ts`: map `customerCreatedAt` and merge returned persisted rows.
- Modify `src/features/dashboard/dashboard-booking-data.test.ts`: mapping and create/update merge tests.
- Modify `src/features/dashboard/dashboard-bookings.tsx`: availability-aware calendar, asynchronous create/update, and safe failure states.
- Modify `src/features/dashboard/dashboard-bookings.test.tsx`: available-date/time, pending, create, update, and stale-slot interaction tests.
- Create `src/routes/-dashboard-bookings.test.tsx`: persisted create/update route mutation tests.
- Modify `src/routes/dashboard/bookings.tsx`: call persisted administrator mutations and merge returned rows.
- Modify `src/features/dashboard/use-persisted-booking-data.ts`: explicit loading, caught failures, and retry contract.
- Create `src/features/dashboard/use-persisted-booking-data.test.tsx`: loading, authorization, success, retry, and caught-failure tests.
- Modify `src/routes/dashboard/index.tsx`: load and render live persisted overview data.
- Modify `src/features/dashboard/dashboard-overview.test.tsx`: use test fixtures and prove design-only data.
- Modify `src/features/dashboard/dashboard-availability.tsx`: remove reminder-preference props and controls.
- Modify `src/features/dashboard/dashboard-availability.test.tsx`: remove reminder assertions and prove controls are absent.
- Modify `src/routes/dashboard/availability.tsx`: remove dashboard context and reminder props.
- Modify `src/routes/dashboard.tsx`: remove `DashboardProvider` from the authenticated shell.
- Modify `src/routes/-dashboard-auth.test.tsx`: remove provider mock and retain access-gate coverage.
- Update the seven dashboard tests that import `demoDashboardState` to import the test fixture.
- Delete `src/features/dashboard/dashboard-data.ts`.
- Delete `src/features/dashboard/dashboard-store.tsx`.
- Delete `src/features/dashboard/dashboard-store.test.tsx`.

---

### Task 1: Persisted Customer Projection and Test-Only Fixtures

**Files:**
- Create: `src/test/fixtures/dashboard.ts`
- Modify: `src/features/book-call/booking-domain.ts`
- Modify: `src/features/book-call/booking-repository.server.ts`
- Modify: `src/features/book-call/booking-repository.server.test.ts`
- Modify: `src/features/dashboard/dashboard-model.ts`
- Modify: `src/features/dashboard/dashboard-model.test.ts`
- Modify: `src/features/dashboard/dashboard-booking-data.ts`
- Modify: `src/features/dashboard/dashboard-booking-data.test.ts`
- Modify: `src/features/dashboard/dashboard-data.ts` (temporary timestamp compatibility until Task 7 deletes it)
- Modify fixture imports in:
  - `src/features/dashboard/dashboard-bookings.test.tsx`
  - `src/features/dashboard/dashboard-customer-profile.test.tsx`
  - `src/features/dashboard/dashboard-customers.test.tsx`
  - `src/features/dashboard/dashboard-next-appointment-dialog.test.tsx`
  - `src/features/dashboard/dashboard-overview.test.tsx`

**Interfaces:**
- Produces: `BookingListItem.customerCreatedAt: string`.
- Produces: `Customer.createdAt: string` and `Customer.updatedAt: string`.
- Produces: `dashboardFixture: { customers: Customer[]; appointments: Appointment[] }` from a test-only module.
- Produces: `persistedBookingFixture: BookingListItem` for server/route/hook tests.
- Produces: `mergePersistedBooking(data, booking): DashboardBookingData` for later create/update route mutations.

- [ ] **Step 1: Move sample data behind a test-only import**

Create `src/test/fixtures/dashboard.ts` by extracting the exact six-customer and ten-appointment array literals currently in `dashboard-data.ts`. Preserve every existing customer/appointment ID and appointment timestamp. Add these creation timestamps to both the fixture and the temporary runtime sample file:

| Customer | `createdAt` |
| --- | --- |
| `customer-1` | `2026-07-05T08:00:00.000Z` |
| `customer-2` | `2026-07-08T09:30:00.000Z` |
| `customer-3` | `2026-07-09T11:00:00.000Z` |
| `customer-4` | `2026-07-06T12:00:00.000Z` |
| `customer-5` | `2026-07-10T07:15:00.000Z` |
| `customer-6` | `2026-07-03T16:30:00.000Z` |

The test-only file ends with:

```ts
import type { BookingListItem } from "@/features/book-call/booking-domain";
import type { Appointment, Customer } from "@/features/dashboard/dashboard-model";

export const dashboardFixture: {
  customers: Customer[];
  appointments: Appointment[];
} = {
  customers,
  appointments,
};

export const persistedBookingFixture: BookingListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  customerStage: "fitting",
  customerCreatedAt: "2026-06-20T08:00:00.000Z",
  customerUpdatedAt: "2026-07-01T09:00:00.000Z",
  appointmentType: "First Fitting",
  appointmentDate: "2026-07-19",
  appointmentTime: "11:00",
  notes: "Bring shoes",
  status: "confirmed",
  reminderStatus: "scheduled",
  createdAt: "2026-07-16T09:00:00.000Z",
};
```

Update the listed tests to import `dashboardFixture` from `@/test/fixtures/dashboard` and replace `demoDashboardState` references mechanically. Do not import this module from production code.

- [ ] **Step 2: Write failing timestamp and normalization tests**

Add `customerCreatedAt` to the `BookingListItem` fixture in `dashboard-booking-data.test.ts`, then assert:

```ts
expect(data.customers[0]).toMatchObject({
  id: first.customerId,
  createdAt: "2026-06-20T08:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z",
});
expect("notes" in data.customers[0]).toBe(false);
expect("activity" in data.customers[0]).toBe(false);
```

Add this merge test:

```ts
it("merges a persisted create or update without inventing a local row", () => {
  const data = normalizeBookingList([first]);
  const updated = { ...first, notes: "Persisted update", status: "confirmed" as const };
  const merged = mergePersistedBooking(data, updated);
  expect(merged.appointments).toHaveLength(1);
  expect(merged.appointments[0]).toMatchObject({
    id: first.id,
    notes: "Persisted update",
    status: "confirmed",
  });
});
```

In `dashboard-model.test.ts`, replace the activity-derived creation fixture with explicit `createdAt` and assert that `getDashboardMetricComparisons` uses `createdAt`, not `updatedAt`.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/dashboard-model.test.ts
```

Expected: FAIL because `BookingListItem.customerCreatedAt`, `Customer.createdAt`, and `mergePersistedBooking` do not exist and legacy customer notes/activity are still mapped.

- [ ] **Step 4: Implement the persisted timestamp contract**

In `booking-domain.ts`, extend `BookingListItem`:

```ts
export type BookingListItem = Omit<ValidatedBooking, "appointmentType"> & {
  id: string;
  customerId: string;
  customerStage: CustomerStage;
  customerCreatedAt: string;
  customerUpdatedAt: string;
  appointmentType: AppointmentType;
  status: BookingStatus;
  reminderStatus: BookingReminderStatus;
  createdAt: string;
};
```

In every booking repository row projection—list, status update, scheduled-next current/next, and later administrator writes—select `customers.created_at::text AS customer_created_at`, add the row field, and map it as `customerCreatedAt`.

Replace the dashboard customer contract temporarily with the following. The optional legacy fields keep the soon-to-be-deleted sample store compiling while normalized persisted customers omit them; Task 7 removes the fields and their types entirely.

```ts
export type Customer = {
  id: string;
  name: string;
  phone: string;
  stage: CustomerStage;
  createdAt: string;
  updatedAt: string;
  notes?: CustomerNote[];
  activity?: CustomerActivity[];
};
```

Remove `CustomerNote`, `CustomerActivity`, `DashboardState`, and `ReminderSettings` only after their remaining runtime consumers are removed in Task 7.

Update `dashboard-booking-data.ts`:

```ts
function mapCustomer(booking: BookingListItem): Customer {
  return {
    id: booking.customerId,
    name: booking.fullName,
    phone: booking.mobile,
    stage: booking.customerStage,
    createdAt: booking.customerCreatedAt,
    updatedAt: booking.customerUpdatedAt,
  };
}

export function mergePersistedBooking(
  data: DashboardBookingData,
  booking: BookingListItem,
): DashboardBookingData {
  const normalized = normalizeBookingList([booking]);
  const customer = normalized.customers[0];
  const appointment = normalized.appointments[0];
  return {
    customers: data.customers.some((item) => item.id === customer.id)
      ? data.customers.map((item) => (item.id === customer.id ? customer : item))
      : [...data.customers, customer],
    appointments: data.appointments.some((item) => item.id === appointment.id)
      ? data.appointments.map((item) => (item.id === appointment.id ? appointment : item))
      : [...data.appointments, appointment],
  };
}
```

Change `getCustomerCreatedAt(customer)` to return `customer.createdAt` directly.

- [ ] **Step 5: Run focused and dependent tests and verify GREEN**

Run:

```powershell
npx vitest run src/features/book-call/booking-repository.server.test.ts src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-overview.test.tsx src/features/dashboard/dashboard-customers.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx
```

Expected: PASS with every booking-row fixture containing `customerCreatedAt` and no production mapping of empty notes/activity arrays.

- [ ] **Step 6: Commit Task 1**

```powershell
git add src/test/fixtures/dashboard.ts src/features/book-call/booking-domain.ts src/features/book-call/booking-repository.server.ts src/features/book-call/booking-repository.server.test.ts src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-booking-data.ts src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/dashboard-data.ts src/features/dashboard/dashboard-bookings.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx src/features/dashboard/dashboard-customers.test.tsx src/features/dashboard/dashboard-next-appointment-dialog.test.tsx src/features/dashboard/dashboard-overview.test.tsx
git commit -m "refactor: define persisted dashboard data contract"
```

---

### Task 2: Authenticated Administrator Availability Projections

**Files:**
- Modify: `src/features/availability/availability-service.ts`
- Modify: `src/features/availability/availability-service.test.ts`
- Modify: `src/features/availability/availability.functions.ts`

**Interfaces:**
- Produces: `loadOpenDatesForAdmin(request, dependencies)`.
- Produces: `loadSlotsForAdmin(request, dependencies)`.
- Produces server functions `getAdminBookingAvailabilityMonth` and `getAdminBookingAvailabilityDay`.
- Preserves public `getPublicAvailabilityMonth` and `getPublicAvailabilityDay` contracts unchanged.

- [ ] **Step 1: Write failing authorization and edit-exclusion tests**

Add imports and tests in `availability-service.test.ts`:

```ts
it("authorizes admin slot projection and excludes only the edited appointment", async () => {
  const deps = dependencies();
  deps.repository.listOccupiedAppointments.mockResolvedValue([
    { id: "11111111-1111-4111-8111-111111111111", date: "2026-07-19", startsAt: "11:00", status: "confirmed" },
    { id: "22222222-2222-4222-8222-222222222222", date: "2026-07-19", startsAt: "12:00", status: "confirmed" },
  ]);
  const result = await loadSlotsForAdmin(
    {
      token: "admin-token",
      date: "2026-07-19",
      excludeAppointmentId: "11111111-1111-4111-8111-111111111111",
    },
    deps,
  );
  expect(result).toMatchObject({ success: true });
  if (result.success) {
    expect(result.slots.map((slot) => slot.startsAt)).toContain("11:00");
    expect(result.slots.map((slot) => slot.startsAt)).not.toContain("12:00");
  }
});

it("does not resolve availability for a forbidden administrator", async () => {
  const deps = dependencies(false);
  await expect(loadOpenDatesForAdmin({ token: "bad", month: "2026-07" }, deps)).resolves.toEqual({
    success: false,
    reason: "forbidden",
  });
  expect(deps.repository.loadConfiguration).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the service test and verify RED**

Run:

```powershell
npx vitest run src/features/availability/availability-service.test.ts
```

Expected: FAIL because the authenticated projection functions do not exist.

- [ ] **Step 3: Add internal exclusion and authenticated projections**

Extend the public service helpers with an internal optional final parameter without changing public callers:

```ts
function excludeAppointment(
  appointments: OccupiedAppointment[],
  excludeAppointmentId?: string,
) {
  return excludeAppointmentId
    ? appointments.filter((item) => item.id !== excludeAppointmentId)
    : appointments;
}

export async function getSlotsForDate(
  date: string,
  repository: AvailabilityRepository,
  now = new Date(),
  excludeAppointmentId?: string,
) {
  try {
    const [configuration, appointments] = await Promise.all([
      repository.loadConfiguration(),
      repository.listOccupiedAppointments(date, date),
    ]);
    return {
      success: true as const,
      slots: resolveAvailableSlots(
        configuration,
        date,
        excludeAppointment(appointments, excludeAppointmentId),
        now,
      ),
    };
  } catch {
    return { success: false as const, reason: "load-error" as const };
  }
}

export async function getOpenDatesForMonth(
  month: string,
  repository: AvailabilityRepository,
  now = new Date(),
  excludeAppointmentId?: string,
) {
  try {
    const dates = listMonthDates(month);
    const [configuration, appointments] = await Promise.all([
      repository.loadConfiguration(),
      repository.listOccupiedAppointments(dates[0], dates.at(-1) as string),
    ]);
    const visibleAppointments = excludeAppointment(appointments, excludeAppointmentId);
    return {
      success: true as const,
      openDates: dates.filter(
        (date) => resolveAvailableSlots(configuration, date, visibleAppointments, now).length,
      ),
    };
  } catch {
    return { success: false as const, reason: "load-error" as const };
  }
}
```

Add these exact authenticated wrappers:

```ts
type AdminProjectionRequest = {
  token: string;
  excludeAppointmentId?: string;
};

export async function loadOpenDatesForAdmin(
  request: AdminProjectionRequest & { month: string },
  dependencies: AvailabilityAdminDependencies,
) {
  if (!(await isAuthorized(request.token, dependencies))) {
    return { success: false as const, reason: "forbidden" as const };
  }
  return getOpenDatesForMonth(
    request.month,
    resolveRepository(dependencies),
    dependencies.now(),
    request.excludeAppointmentId,
  );
}

export async function loadSlotsForAdmin(
  request: AdminProjectionRequest & { date: string },
  dependencies: AvailabilityAdminDependencies,
) {
  if (!(await isAuthorized(request.token, dependencies))) {
    return { success: false as const, reason: "forbidden" as const };
  }
  return getSlotsForDate(
    request.date,
    resolveRepository(dependencies),
    dependencies.now(),
    request.excludeAppointmentId,
  );
}
```

- [ ] **Step 4: Expose authenticated server functions**

In `availability.functions.ts`, add validators that keep exclusion admin-only:

```ts
const adminProjectionBase = {
  token: z.string().min(1),
  excludeAppointmentId: z.string().uuid().optional(),
};

export const getAdminBookingAvailabilityMonth = createServerFn({ method: "POST" })
  .validator(z.object({ ...adminProjectionBase, month: z.string().regex(/^\d{4}-\d{2}$/) }))
  .handler(({ data }) => loadOpenDatesForAdmin(data, adminDependencies()));

export const getAdminBookingAvailabilityDay = createServerFn({ method: "POST" })
  .validator(z.object({ ...adminProjectionBase, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(({ data }) => loadSlotsForAdmin(data, adminDependencies()));
```

Do not add `excludeAppointmentId` to either public validator.

- [ ] **Step 5: Run availability tests and verify GREEN**

Run:

```powershell
npx vitest run src/features/availability
```

Expected: PASS; public tests retain their original calls, and admin tests prove authorization plus self-exclusion.

- [ ] **Step 6: Commit Task 2**

```powershell
git add src/features/availability/availability-service.ts src/features/availability/availability-service.test.ts src/features/availability/availability.functions.ts
git commit -m "feat: expose admin booking availability"
```

---

### Task 3: Administrator Booking Domain and Repository Writes

**Files:**
- Modify: `src/features/book-call/booking-domain.ts`
- Modify: `src/features/book-call/booking-domain.test.ts`
- Modify: `src/features/book-call/booking-repository.server.ts`
- Modify: `src/features/book-call/booking-repository.server.test.ts`

**Interfaces:**
- Produces: `AdminBookingInput`, `ValidatedAdminBooking`, and `parseAdminBookingInput(input)`.
- Produces repository methods `createForAdmin(input)` and `updateForAdmin(id, input)`.
- Both repository methods return a full `BookingListItem` or safe `not-found`/`slot-unavailable` outcomes.

- [ ] **Step 1: Write failing administrator input tests**

Add to `booking-domain.test.ts`:

```ts
const adminInput = {
  customerId: "22222222-2222-4222-8222-222222222222",
  appointmentType: "First Fitting",
  appointmentDate: "2026-07-19",
  appointmentTime: "11:00",
  notes: "  Bring shoes  ",
  status: "confirmed",
  reminderStatus: "scheduled",
};

it("parses and normalizes an administrator appointment", () => {
  expect(parseAdminBookingInput(adminInput)).toEqual({
    success: true,
    data: { ...adminInput, notes: "Bring shoes" },
  });
});

it("rejects invalid customer, appointment type, status, reminder, and notes", () => {
  const result = parseAdminBookingInput({
    ...adminInput,
    customerId: "not-a-uuid",
    appointmentType: "Workshop",
    status: "refunded",
    reminderStatus: "queued",
    notes: "x".repeat(1001),
  });
  expect(result).toMatchObject({ success: false });
  if (!result.success) {
    expect(result.fieldErrors).toMatchObject({
      customerId: expect.any(String),
      appointmentType: expect.any(String),
      status: expect.any(String),
      reminderStatus: expect.any(String),
      notes: expect.any(String),
    });
  }
});
```

- [ ] **Step 2: Run the domain test and verify RED**

Run:

```powershell
npx vitest run src/features/book-call/booking-domain.test.ts
```

Expected: FAIL because the administrator input parser does not exist.

- [ ] **Step 3: Implement the administrator input parser**

Add:

```ts
export type AdminBookingInput = {
  customerId: string;
  appointmentType: AppointmentType;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  status: BookingStatus;
  reminderStatus: BookingReminderStatus;
};

export type ValidatedAdminBooking = AdminBookingInput;

const adminBookingSchema = z.object({
  customerId: z.string().uuid("Choose a valid customer."),
  appointmentType: z.enum(nextAppointmentTypes, { message: "Choose an appointment type." }),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an available date."),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose an available time."),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer."),
  status: z.enum(bookingStatuses, { message: "Choose a booking status." }),
  reminderStatus: z.enum(reminderStatuses, { message: "Choose a reminder status." }),
});

export function parseAdminBookingInput(input: unknown) {
  const parsed = adminBookingSchema.safeParse(input);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      success: false as const,
      fieldErrors: Object.fromEntries(
        Object.entries(fields).map(([key, messages]) => [key, messages?.[0]]),
      ) as Partial<Record<keyof AdminBookingInput, string>>,
    };
  }
  return { success: true as const, data: { ...parsed.data, notes: parsed.data.notes.trim() } };
}
```

- [ ] **Step 4: Write failing repository create/update tests**

Extract the existing joined row from the status-update test into these module-level fixtures, adding the customer creation timestamp required by Task 1:

```ts
const persistedRow = {
  id: "11111111-1111-4111-8111-111111111111",
  customer_id: "22222222-2222-4222-8222-222222222222",
  full_name: "Noor Al-Hashemi",
  mobile: "+970591234567",
  customer_stage: "new-inquiry" as const,
  customer_created_at: "2026-06-20T08:00:00.000Z",
  customer_updated_at: "2026-07-01T09:00:00.000Z",
  appointment_type: "First Fitting" as const,
  appointment_date: "2026-07-13",
  appointment_time: "10:00",
  notes: "Bring reference photos",
  status: "confirmed" as const,
  reminder_status: "not-scheduled" as const,
  created_at: "2026-07-01T10:00:00.000Z",
};

const expectedBooking: BookingListItem = {
  id: persistedRow.id,
  customerId: persistedRow.customer_id,
  fullName: persistedRow.full_name,
  mobile: persistedRow.mobile,
  customerStage: persistedRow.customer_stage,
  customerCreatedAt: persistedRow.customer_created_at,
  customerUpdatedAt: persistedRow.customer_updated_at,
  appointmentType: persistedRow.appointment_type,
  appointmentDate: persistedRow.appointment_date,
  appointmentTime: persistedRow.appointment_time,
  notes: persistedRow.notes,
  status: persistedRow.status,
  reminderStatus: persistedRow.reminder_status,
  createdAt: persistedRow.created_at,
};
```

Use them in the new tests:

```ts
it("creates an admin appointment for an existing customer and returns the joined row", async () => {
  const execute = vi.fn<QueryExecutor>().mockResolvedValue([persistedRow]);
  await expect(createBookingRepository(execute).createForAdmin(adminInput)).resolves.toEqual({
    success: true,
    booking: expectedBooking,
  });
  expect(execute).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO public.appointments"), [
    adminInput.customerId,
    adminInput.appointmentType,
    adminInput.appointmentDate,
    adminInput.appointmentTime,
    adminInput.notes,
    adminInput.status,
    adminInput.reminderStatus,
  ]);
});

it("updates an admin appointment with one parameterized statement", async () => {
  const execute = vi.fn<QueryExecutor>().mockResolvedValue([persistedRow]);
  await expect(createBookingRepository(execute).updateForAdmin(persistedRow.id, adminInput)).resolves.toMatchObject({ success: true });
  expect(execute).toHaveBeenCalledWith(expect.stringContaining("UPDATE public.appointments"), [
    persistedRow.id,
    adminInput.customerId,
    adminInput.appointmentType,
    adminInput.appointmentDate,
    adminInput.appointmentTime,
    adminInput.notes,
    adminInput.status,
    adminInput.reminderStatus,
  ]);
});

it.each(["createForAdmin", "updateForAdmin"] as const)("maps %s slot conflicts safely", async (method) => {
  const execute = vi.fn<QueryExecutor>().mockRejectedValue({ code: "23P01", constraint: "appointments_active_time_overlap" });
  const repository = createBookingRepository(execute);
  const result = method === "createForAdmin"
    ? await repository.createForAdmin(adminInput)
    : await repository.updateForAdmin(persistedRow.id, adminInput);
  expect(result).toEqual({ success: false, reason: "slot-unavailable" });
});
```

Also assert empty returned rows become `{ success: false, reason: "not-found" }` for both methods.

- [ ] **Step 5: Run repository tests and verify RED**

Run:

```powershell
npx vitest run src/features/book-call/booking-repository.server.test.ts
```

Expected: FAIL because `createForAdmin` and `updateForAdmin` are absent.

- [ ] **Step 6: Implement parameterized repository writes**

Extend `BookingRepository` with the two methods. Use a CTE for each write and return the same aliases consumed by `mapBookingRow`.

Create SQL shape:

```sql
WITH inserted AS (
  INSERT INTO public.appointments (
    customer_id, appointment_type, appointment_date, appointment_time,
    notes, status, reminder_status
  )
  SELECT $1::uuid, $2, $3::date, $4::time, $5, $6, $7
  WHERE EXISTS (SELECT 1 FROM public.customers WHERE id = $1::uuid)
  RETURNING *
)
SELECT
  inserted.id,
  customer.id AS customer_id,
  customer.full_name,
  customer.mobile,
  customer.stage AS customer_stage,
  customer.created_at::text AS customer_created_at,
  customer.updated_at::text AS customer_updated_at,
  inserted.appointment_type,
  inserted.appointment_date::text,
  to_char(inserted.appointment_time, 'HH24:MI') AS appointment_time,
  inserted.notes,
  inserted.status,
  inserted.reminder_status,
  inserted.created_at::text
FROM inserted
JOIN public.customers customer ON customer.id = inserted.customer_id
```

The update CTE sets all seven editable columns, updates `updated_at = now()`, requires both appointment ID and customer existence, and returns the same projection. Translate both unique and exclusion constraint errors using `isActiveSlotConflict`.

- [ ] **Step 7: Run domain and repository tests and verify GREEN**

Run:

```powershell
npx vitest run src/features/book-call/booking-domain.test.ts src/features/book-call/booking-repository.server.test.ts
```

Expected: PASS with safe not-found and slot-unavailable results.

- [ ] **Step 8: Commit Task 3**

```powershell
git add src/features/book-call/booking-domain.ts src/features/book-call/booking-domain.test.ts src/features/book-call/booking-repository.server.ts src/features/book-call/booking-repository.server.test.ts
git commit -m "feat: persist admin appointment writes"
```

---

### Task 4: Authorized Mutation Orchestration and Canonical Revalidation

**Files:**
- Modify: `src/features/auth/admin.functions.ts`
- Modify: `src/features/auth/admin.functions.test.ts`

**Interfaces:**
- Produces: `createBookingForAdmin({ token, input }, dependencies)`.
- Produces: `updateBookingForAdmin({ token, id, input }, dependencies)`.
- Produces server functions `createAdminBooking` and `updateAdminBooking`.
- Returns success with a persisted `BookingListItem`, or `forbidden`, `validation`, `not-found`, `slot-unavailable`, or `storage-error`.

- [ ] **Step 1: Write failing service tests for authorization and revalidation**

Add a dependency factory with lazy repositories and fixed time:

```ts
const availabilityConfiguration: AvailabilityConfiguration = {
  timezone: "Asia/Jerusalem",
  slotDurationMinutes: 60,
  weekly: DEFAULT_WEEKLY_SCHEDULE,
  overrides: [],
};

const adminInput: AdminBookingInput = {
  customerId: appointment.customerId,
  appointmentType: "First Fitting",
  appointmentDate: "2026-07-19",
  appointmentTime: "11:00",
  notes: "Bring shoes",
  status: "confirmed",
  reminderStatus: "scheduled",
};

function adminMutationDependencies(allowed = true) {
  const bookingRepository = {
    createForAdmin: vi.fn().mockResolvedValue({ success: true, booking: appointment }),
    updateForAdmin: vi.fn().mockResolvedValue({ success: true, booking: appointment }),
  };
  const availabilityRepository = {
    loadConfiguration: vi.fn().mockResolvedValue(availabilityConfiguration),
    listOccupiedAppointments: vi.fn().mockResolvedValue([]),
  };
  return {
    verifyAdminToken: vi.fn().mockResolvedValue({ allowed }),
    now: () => new Date("2026-07-15T09:00:00Z"),
    bookingRepository,
    availabilityRepository,
    getBookingRepository: vi.fn(() => bookingRepository),
    getAvailabilityRepository: vi.fn(() => availabilityRepository),
  };
}
```

Cover these exact behaviors:

```ts
it("rejects forbidden creation before resolving repositories", async () => {
  const deps = adminMutationDependencies(false);
  await expect(createBookingForAdmin({ token: "bad", input: adminInput }, deps)).resolves.toEqual({ success: false, reason: "forbidden" });
  expect(deps.getBookingRepository).not.toHaveBeenCalled();
  expect(deps.getAvailabilityRepository).not.toHaveBeenCalled();
});

it("rejects a slot not returned by canonical availability", async () => {
  const deps = adminMutationDependencies();
  deps.availabilityRepository.listOccupiedAppointments.mockResolvedValue([
    { id: "occupied", date: adminInput.appointmentDate, startsAt: adminInput.appointmentTime, status: "confirmed" },
  ]);
  await expect(createBookingForAdmin({ token: "admin", input: adminInput }, deps)).resolves.toEqual({ success: false, reason: "slot-unavailable" });
});

it("excludes only the edited appointment during update revalidation", async () => {
  const deps = adminMutationDependencies();
  deps.availabilityRepository.listOccupiedAppointments.mockResolvedValue([
    { id: appointment.id, date: adminInput.appointmentDate, startsAt: adminInput.appointmentTime, status: "confirmed" },
  ]);
  await expect(updateBookingForAdmin({ token: "admin", id: appointment.id, input: adminInput }, deps)).resolves.toMatchObject({ success: true });
});
```

Also cover validation failure, availability load error, repository not-found, repository conflict, and repository exception.

- [ ] **Step 2: Run admin tests and verify RED**

Run:

```powershell
npx vitest run src/features/auth/admin.functions.test.ts
```

Expected: FAIL because create/update orchestration does not exist.

- [ ] **Step 3: Implement lazy authorized orchestration**

Add `AdminBookingMutationDependencies` with lazy booking and availability repositories. Authorization must run before either factory. Parse input before availability queries. Then call:

```ts
const availability = await getSlotsForDate(
  parsed.data.appointmentDate,
  dependencies.getAvailabilityRepository(),
  dependencies.now(),
  excludeAppointmentId,
);
if (!availability.success) return { success: false as const, reason: "storage-error" as const };
if (!availability.slots.some((slot) => slot.startsAt === parsed.data.appointmentTime)) {
  return { success: false as const, reason: "slot-unavailable" as const };
}
```

Only after that call `createForAdmin(parsed.data)` or `updateForAdmin(id, parsed.data)`. Preserve safe repository outcomes and translate thrown errors to `storage-error`.

Expose:

```ts
export const createAdminBooking = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), input: z.unknown() }))
  .handler(({ data }) => createBookingForAdmin(data));

export const updateAdminBooking = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), id: z.string().uuid(), input: z.unknown() }))
  .handler(({ data }) => updateBookingForAdmin(data));
```

- [ ] **Step 4: Run admin, availability, and repository tests and verify GREEN**

Run:

```powershell
npx vitest run src/features/auth/admin.functions.test.ts src/features/availability/availability-service.test.ts src/features/book-call/booking-repository.server.test.ts
```

Expected: PASS; a write is impossible unless authorization, parsing, and canonical slot resolution all succeed.

- [ ] **Step 5: Commit Task 4**

```powershell
git add src/features/auth/admin.functions.ts src/features/auth/admin.functions.test.ts
git commit -m "feat: validate admin bookings against availability"
```

---

### Task 5: Race-Safe Administrator Availability Hook

**Files:**
- Create: `src/features/dashboard/use-admin-booking-availability.ts`
- Create: `src/features/dashboard/use-admin-booking-availability.test.tsx`

**Interfaces:**
- Produces `useAdminBookingAvailability()` with `openDates`, `slots`, loading flags, error, `loadMonth(month, excludeAppointmentId?)`, `loadDate(date, excludeAppointmentId?)`, and `clear()`.

- [ ] **Step 1: Write failing hook tests**

Mock `neonAuth.getJWTToken`, `getAdminBookingAvailabilityMonth`, and `getAdminBookingAvailabilityDay`. Assert:

```ts
await result.current.loadMonth(new Date(2026, 6, 1), appointmentId);
expect(getAdminBookingAvailabilityMonth).toHaveBeenCalledWith({
  data: { token: "admin-token", month: "2026-07", excludeAppointmentId: appointmentId },
});

await result.current.loadDate("2026-07-19", appointmentId);
expect(getAdminBookingAvailabilityDay).toHaveBeenCalledWith({
  data: { token: "admin-token", date: "2026-07-19", excludeAppointmentId: appointmentId },
});
```

Add deferred promises proving the latest month/date response wins, a missing token yields `Please sign in again.`, forbidden yields the same message, load errors yield `Could not load available appointments.`, and `clear()` empties dates, slots, and errors.

- [ ] **Step 2: Run the hook test and verify RED**

Run:

```powershell
npx vitest run src/features/dashboard/use-admin-booking-availability.test.tsx
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook**

Implement the complete hook below. It acquires a token for every request and uses one cross-request generation plus per-loader generations so stale results cannot overwrite current data or loading flags.

```ts
import { useCallback, useRef, useState } from "react";
import {
  getAdminBookingAvailabilityDay,
  getAdminBookingAvailabilityMonth,
} from "@/features/availability/availability.functions";
import type { AvailableSlot } from "@/features/availability/availability-domain";
import { neonAuth } from "@/features/auth/neon-auth-client";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function useAdminBookingAvailability() {
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState("");
  const latestRequest = useRef(0);
  const latestMonthRequest = useRef(0);
  const latestDateRequest = useRef(0);

  const loadMonth = useCallback(async (month: Date, excludeAppointmentId?: string) => {
    const requestId = ++latestRequest.current;
    const monthRequestId = ++latestMonthRequest.current;
    setMonthLoading(true);
    setSlots([]);
    setError("");
    try {
      const token = await neonAuth.getJWTToken();
      if (requestId !== latestRequest.current) return;
      if (!token) {
        setOpenDates([]);
        setError("Please sign in again.");
        return;
      }
      const result = await getAdminBookingAvailabilityMonth({
        data: { token, month: monthKey(month), excludeAppointmentId },
      });
      if (requestId !== latestRequest.current) return;
      if (!result.success) {
        setOpenDates([]);
        setError(
          result.reason === "forbidden"
            ? "Please sign in again."
            : "Could not load available appointments.",
        );
        return;
      }
      setOpenDates(result.openDates);
    } catch {
      if (requestId === latestRequest.current) {
        setOpenDates([]);
        setError("Could not load available appointments.");
      }
    } finally {
      if (monthRequestId === latestMonthRequest.current) setMonthLoading(false);
    }
  }, []);

  const loadDate = useCallback(async (date: string, excludeAppointmentId?: string) => {
    const requestId = ++latestRequest.current;
    const dateRequestId = ++latestDateRequest.current;
    setSlotsLoading(true);
    setSlots([]);
    setError("");
    try {
      const token = await neonAuth.getJWTToken();
      if (requestId !== latestRequest.current) return;
      if (!token) {
        setSlots([]);
        setError("Please sign in again.");
        return;
      }
      const result = await getAdminBookingAvailabilityDay({
        data: { token, date, excludeAppointmentId },
      });
      if (requestId !== latestRequest.current) return;
      if (!result.success) {
        setSlots([]);
        setError(
          result.reason === "forbidden"
            ? "Please sign in again."
            : "Could not load available appointments.",
        );
        return;
      }
      setSlots(result.slots);
    } catch {
      if (requestId === latestRequest.current) {
        setSlots([]);
        setError("Could not load available appointments.");
      }
    } finally {
      if (dateRequestId === latestDateRequest.current) setSlotsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    latestRequest.current += 1;
    setOpenDates([]);
    setSlots([]);
    setError("");
    setMonthLoading(false);
    setSlotsLoading(false);
  }, []);
  return { openDates, slots, monthLoading, slotsLoading, error, loadMonth, loadDate, clear };
}
```

Do not reuse the public hook because it cannot accept an authenticated edit exclusion.

- [ ] **Step 4: Run hook tests and verify GREEN**

Run:

```powershell
npx vitest run src/features/dashboard/use-admin-booking-availability.test.tsx src/features/book-call/use-booking-availability.test.tsx
```

Expected: PASS with public behavior unchanged and admin requests race-safe.

- [ ] **Step 5: Commit Task 5**

```powershell
git add src/features/dashboard/use-admin-booking-availability.ts src/features/dashboard/use-admin-booking-availability.test.tsx
git commit -m "feat: load available admin appointment slots"
```

---

### Task 6: Persisted, Availability-Aware Booking Dialog

**Files:**
- Modify: `src/features/dashboard/dashboard-bookings.tsx`
- Modify: `src/features/dashboard/dashboard-bookings.test.tsx`
- Modify: `src/features/dashboard/dashboard-booking-data.ts`
- Modify: `src/features/dashboard/dashboard-booking-data.test.ts`
- Create: `src/routes/-dashboard-bookings.test.tsx`
- Modify: `src/routes/dashboard/bookings.tsx`

**Interfaces:**
- `DashboardBookings` consumes asynchronous `onCreate(input)` and `onUpdate(id, input)` callbacks instead of `dispatch`.
- The component uses `useAdminBookingAvailability` for selectable dates/times.
- The route calls `createAdminBooking`/`updateAdminBooking` and merges only returned persisted rows.

- [ ] **Step 1: Write failing dialog tests**

Mock the admin availability hook with two open dates and one slot. Replace the old reducer assertions with:

```ts
it("shows only canonical open dates and returned times", async () => {
  renderBookings();
  fireEvent.click(screen.getByRole("button", { name: "New appointment" }));
  expect(screen.getByRole("button", { name: /sunday, july 19th, 2026/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /monday, july 20th, 2026/i }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /sunday, july 19th, 2026/i }));
  expect(availability.loadDate).toHaveBeenCalledWith("2026-07-19", undefined);
  expect(screen.getByRole("button", { name: "11:00" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "12:00" })).toBeNull();
});

it("loads edit availability while excluding the edited appointment", () => {
  renderBookings();
  fireEvent.click(screen.getByRole("button", { name: /Edit Initial consultation/ }));
  return waitFor(() => {
    expect(availability.loadMonth).toHaveBeenCalledWith(expect.any(Date), appointment.id);
    expect(availability.loadDate).toHaveBeenCalledWith(appointment.startsAt.slice(0, 10), appointment.id);
  });
});

it("keeps the dialog open and reloads slots after a stale-slot rejection", async () => {
  const onCreate = vi.fn().mockResolvedValue({ success: false, reason: "slot-unavailable" });
  renderBookings({ onCreate });
  fireEvent.click(screen.getByRole("button", { name: "New appointment" }));
  fireEvent.change(screen.getByLabelText("Customer"), {
    target: { value: dashboardFixture.customers[0].id },
  });
  fireEvent.change(screen.getByLabelText("Appointment purpose"), {
    target: { value: "New Design" },
  });
  fireEvent.click(screen.getByRole("button", { name: /sunday, july 19th, 2026/i }));
  fireEvent.click(screen.getByRole("button", { name: "11:00" }));
  fireEvent.click(screen.getByRole("button", { name: "Add appointment" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("no longer available");
  expect(availability.loadDate).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("dialog")).toBeTruthy();
});
```

Also test: date change clears time; pending submission disables calendar, slots, fields, and submit; success closes and announces; validation/storage/not-found errors remain open; update calls `onUpdate` with the existing ID.

- [ ] **Step 2: Run booking component tests and verify RED**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-bookings.test.tsx
```

Expected: FAIL because the dialog still uses free date/time inputs and reducer dispatch.

- [ ] **Step 3: Replace free inputs with the existing Calendar and slot buttons**

Import `Calendar`, `formatBookingDate`, `nextAppointmentTypes`, and `useAdminBookingAvailability`. Build the administrator purpose selector from all six `nextAppointmentTypes` values (`New Design`, `Measurements`, `First Fitting`, `Second Fitting`, `Alteration`, and `Pickup`) plus any persisted legacy value, while leaving the public booking type list unchanged. On create, call `loadMonth`. On edit, load the month and then the current date sequentially so the hook's cross-request stale protection does not discard the month response:

```ts
void (async () => {
  await availability.loadMonth(new Date(`${appointment.startsAt.slice(0, 10)}T12:00:00`), appointment.id);
  await availability.loadDate(appointment.startsAt.slice(0, 10), appointment.id);
})();
```

Render:

```tsx
<Calendar
  mode="single"
  selected={form.date ? new Date(`${form.date}T12:00:00`) : undefined}
  onMonthChange={(month) => {
    if (submitting) return;
    setForm((current) => ({ ...current, date: "", time: "" }));
    void availability.loadMonth(month, editingId ?? undefined);
  }}
  onSelect={(date) => {
    if (!date || submitting) return;
    const key = formatBookingDate(date);
    setForm((current) => ({ ...current, date: key, time: "" }));
    void availability.loadDate(key, editingId ?? undefined);
  }}
  disabled={(date) =>
    submitting ||
    availability.monthLoading ||
    !availability.openDates.includes(formatBookingDate(date))
  }
/>

<div aria-label="Available times" className="grid grid-cols-2 gap-2">
  {availability.slots.map((slot) => (
    <button
      key={slot.startsAt}
      type="button"
      disabled={submitting}
      aria-pressed={form.time === slot.startsAt}
      onClick={() => setForm((current) => ({ ...current, time: slot.startsAt }))}
    >
      {slot.startsAt}
    </button>
  ))}
</div>
```

Render retry actions for month/day errors. Never render or retain a time that is absent from `availability.slots`.

- [ ] **Step 4: Replace local dispatch with awaited persisted callbacks**

Use this prop contract:

```ts
type AdminMutationResult =
  | { success: true }
  | {
      success: false;
      reason: "forbidden" | "validation" | "not-found" | "slot-unavailable" | "storage-error";
      fieldErrors?: Partial<Record<keyof AdminBookingInput, string>>;
    };

type DashboardBookingsProps = {
  customers: Customer[];
  appointments: Appointment[];
  onCreate(input: AdminBookingInput): Promise<AdminMutationResult>;
  onUpdate(id: string, input: AdminBookingInput): Promise<AdminMutationResult>;
};
```

Remove only the `dispatch` property from the current full component prop list. Keep the existing named properties `openNewOnMount`, `onStatusChange`, `updatingId`, `updateError`, `onDelete`, `deletingId`, `deleteError`, `onReminderSent`, `reminderUpdatingId`, `reminderError`, and `onScheduleNext` with their current types and defaults.

Make `submit` async, set `submitting`, validate only selected returned slots, await the correct callback, translate safe reasons, reload the selected date on `slot-unavailable`, and close only on success. Delete temporary ID creation and reducer dispatch.

- [ ] **Step 5: Write failing route mutation tests**

Create `src/routes/-dashboard-bookings.test.tsx`. Export `DashboardBookingsRoute` from the route module, mock `DashboardBookings` to capture its props, and mock session, JWT, persisted data, create, and update functions. Define these inputs in the test:

```ts
import { persistedBookingFixture as persistedBooking } from "@/test/fixtures/dashboard";

const adminInput: AdminBookingInput = {
  customerId: persistedBooking.customerId,
  appointmentType: persistedBooking.appointmentType,
  appointmentDate: persistedBooking.appointmentDate,
  appointmentTime: persistedBooking.appointmentTime,
  notes: persistedBooking.notes,
  status: persistedBooking.status,
  reminderStatus: persistedBooking.reminderStatus,
};
```

Prove successful creation merges only the returned row:

```ts
it("merges the persisted row returned by admin creation", async () => {
  createAdminBooking.mockResolvedValue({ success: true, booking: persistedBooking });
  render(<DashboardBookingsRoute />);
  await act(async () => {
    await capturedProps.onCreate(adminInput);
  });
  expect(createAdminBooking).toHaveBeenCalledWith({
    data: { token: "admin-token", input: adminInput },
  });
  const updater = setData.mock.calls[0][0];
  expect(updater(normalizeBookingList([])).appointments[0].id).toBe(persistedBooking.id);
});

it("does not merge a rejected create or update", async () => {
  createAdminBooking.mockResolvedValue({ success: false, reason: "slot-unavailable" });
  render(<DashboardBookingsRoute />);
  await expect(capturedProps.onCreate(adminInput)).resolves.toEqual({
    success: false,
    reason: "slot-unavailable",
  });
  expect(setData).not.toHaveBeenCalled();
});
```

Add the corresponding successful `onUpdate(appointmentId, adminInput)` assertion for `updateAdminBooking`, plus a missing-token result of `{ success: false, reason: "forbidden" }`.

- [ ] **Step 6: Wire the bookings route**

Import `createAdminBooking`, `updateAdminBooking`, and `mergePersistedBooking`. Add `handleCreate` and `handleUpdate` that acquire a fresh JWT, call the server, merge only `result.booking`, and return safe results to the dialog. Remove `useDashboard()` and `dispatch` from the route and component props.

- [ ] **Step 7: Run booking UI and route dependencies and verify GREEN**

Run:

```powershell
npx vitest run src/features/dashboard/dashboard-bookings.test.tsx src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/use-admin-booking-availability.test.tsx src/features/auth/admin.functions.test.ts src/routes/-dashboard-bookings.test.tsx
```

Expected: PASS; the dialog exposes only returned availability and all writes use persisted server results.

- [ ] **Step 8: Commit Task 6**

```powershell
git add src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx src/features/dashboard/dashboard-booking-data.ts src/features/dashboard/dashboard-booking-data.test.ts src/routes/-dashboard-bookings.test.tsx src/routes/dashboard/bookings.tsx
git commit -m "feat: persist dashboard appointment editor"
```

---

### Task 7: Live Overview and Runtime Demo Removal

**Files:**
- Create: `src/routes/-dashboard-index.test.tsx`
- Create: `src/test/dashboard-runtime-data-contract.test.ts`
- Modify: `src/features/dashboard/use-persisted-booking-data.ts`
- Create: `src/features/dashboard/use-persisted-booking-data.test.tsx`
- Modify: `src/routes/dashboard/index.tsx`
- Modify: `src/features/dashboard/dashboard-overview.test.tsx`
- Modify: `src/features/dashboard/dashboard-availability.tsx`
- Modify: `src/features/dashboard/dashboard-availability.test.tsx`
- Modify: `src/routes/dashboard/availability.tsx`
- Modify: `src/routes/dashboard.tsx`
- Modify: `src/routes/-dashboard-auth.test.tsx`
- Modify: `src/features/dashboard/dashboard-model.ts`
- Delete: `src/features/dashboard/dashboard-data.ts`
- Delete: `src/features/dashboard/dashboard-store.tsx`
- Delete: `src/features/dashboard/dashboard-store.test.tsx`

**Interfaces:**
- `usePersistedBookingData(enabled)` returns `{ data, setData, loading, error, reload }`.
- `/dashboard` renders only live design data.
- Dashboard layout renders the shell directly after authentication.
- Availability editor no longer accepts or renders reminder-preference props.

- [ ] **Step 1: Write failing live-overview route tests**

Mock session and `usePersistedBookingData`, export `DashboardIndexRoute` for focused testing, and cover:

```ts
it("renders persisted design data on the overview", () => {
  useSession.mockReturnValue({ data: { user: { id: "admin" } } });
  usePersistedBookingData.mockReturnValue({
    data: dashboardFixture,
    loading: false,
    error: "",
    reload,
  });
  render(<DashboardIndexRoute />);
  expect(screen.getByText("Layan Mansour")).toBeTruthy();
  const designCount = dashboardFixture.appointments.filter((item) => item.type === "design").length;
  const chart = screen.getByRole("heading", { name: "Booking status distribution" }).closest("article");
  expect(within(chart!).getByText(String(designCount))).toBeTruthy();
});

it("renders a loading status while persisted data is pending", () => {
  usePersistedBookingData.mockReturnValue({ data: undefined, loading: true, error: "", reload });
  render(<DashboardIndexRoute />);
  expect(screen.getByRole("status").textContent).toContain("Loading dashboard data");
});

it("renders a retryable persisted-data failure", () => {
  usePersistedBookingData.mockReturnValue({
    data: undefined,
    loading: false,
    error: "Could not load bookings.",
    reload,
  });
  render(<DashboardIndexRoute />);
  expect(screen.getByRole("alert").textContent).toContain("Could not load bookings.");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(reload).toHaveBeenCalledOnce();
});

it("renders genuine empty metrics without sample customers", () => {
  usePersistedBookingData.mockReturnValue({
    data: { customers: [], appointments: [] },
    loading: false,
    error: "",
    reload,
  });
  render(<DashboardIndexRoute />);
  expect(screen.queryByText("Layan Mansour")).toBeNull();
  expect(screen.getByText("All profiles are up to date")).toBeTruthy();
});
```

Use the current mixed test fixture deliberately: the chart assertion above proves the route filters out its workshop appointments before rendering the overview.

- [ ] **Step 2: Write the failing runtime source contract**

Create `src/test/dashboard-runtime-data-contract.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard runtime data contract", () => {
  it("has no runtime demo store or test fixture imports", () => {
    expect(existsSync("src/features/dashboard/dashboard-data.ts")).toBe(false);
    expect(existsSync("src/features/dashboard/dashboard-store.tsx")).toBe(false);
    for (const file of globSync("src/**/*.{ts,tsx}")) {
      if (file.includes(".test.") || file.includes("src/test/")) continue;
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("demoDashboardState");
      expect(source).not.toContain("@/test/fixtures/dashboard");
    }
  });
});
```

- [ ] **Step 3: Run overview and source-contract tests and verify RED**

Run:

```powershell
npx vitest run src/routes/-dashboard-index.test.tsx src/test/dashboard-runtime-data-contract.test.ts
```

Expected: FAIL because the overview still reads dashboard context and demo/store files still exist.

- [ ] **Step 4: Write failing persisted-data hook tests**

First create `use-persisted-booking-data.test.tsx`, import `persistedBookingFixture as persistedBooking` from `@/test/fixtures/dashboard`, mock JWT and `getBookings`, and verify RED with:

```ts
it("loads and normalizes persisted bookings", async () => {
  getJWTToken.mockResolvedValue("admin-token");
  getBookings.mockResolvedValue({ success: true, bookings: [persistedBooking] });
  const { result } = renderHook(() => usePersistedBookingData(true));
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data?.appointments[0].id).toBe(persistedBooking.id);
});

it("catches token and server failures and supports retry", async () => {
  getJWTToken.mockRejectedValueOnce(new Error("network"));
  const { result } = renderHook(() => usePersistedBookingData(true));
  await waitFor(() => expect(result.current.error).toBe("Could not load bookings."));
  getJWTToken.mockResolvedValueOnce("admin-token");
  getBookings.mockResolvedValueOnce({ success: true, bookings: [] });
  await act(() => result.current.reload());
  expect(result.current.error).toBe("");
  expect(result.current.data).toEqual({ customers: [], appointments: [] });
});
```

- [ ] **Step 5: Run the persisted-data hook test and verify RED**

Run:

```powershell
npx vitest run src/features/dashboard/use-persisted-booking-data.test.tsx
```

Expected: FAIL because `loading` and caught-failure behavior are missing.

- [ ] **Step 6: Make persisted loading explicit and safe**

Update `usePersistedBookingData` with a `loading` boolean, `try/catch/finally`, and this behavior:

```ts
const reload = useCallback(async () => {
  if (!enabled) {
    setLoading(false);
    return;
  }
  setLoading(true);
  setError("");
  try {
    const token = await neonAuth.getJWTToken();
    if (!token) {
      setError("Please sign in again.");
      return;
    }
    const result = await getBookings({ data: { token } });
    if (!result.success) {
      setError(result.reason === "forbidden" ? "You do not have access to bookings." : "Could not load bookings.");
      return;
    }
    setData(normalizeBookingList(result.bookings));
  } catch {
    setError("Could not load bookings.");
  } finally {
    setLoading(false);
  }
}, [enabled]);
```

Update existing bookings/customers routes to use `loading` instead of treating `data === undefined` as the only loading signal.

- [ ] **Step 7: Wire the overview to persisted design data**

Implement:

```tsx
function DashboardOverviewSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard data" className="space-y-4">
      <span className="sr-only">Loading dashboard data…</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-[10px]" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-[10px]" />
    </div>
  );
}

function DashboardLoadError({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <div role="alert" className="space-y-3 text-sm text-rose-600">
      <p>{message}</p>
      <button type="button" className="underline" onClick={onRetry}>Try again</button>
    </div>
  );
}

export function DashboardIndexRoute() {
  const { data: session } = authClient.useSession();
  const { data, loading, error, reload } = usePersistedBookingData(Boolean(session?.user));
  if (loading) return <DashboardOverviewSkeleton />;
  if (error) return <DashboardLoadError message={error} onRetry={() => void reload()} />;
  const customers = data?.customers ?? [];
  const appointments = (data?.appointments ?? []).filter((item) => item.type === "design");
  return <DashboardOverview customers={customers} appointments={appointments} />;
}
```

Use existing dashboard skeleton/empty styling; do not introduce sample fallback values.

- [ ] **Step 8: Remove reminder preferences from availability**

Delete `reminderSettings` and `onReminderChange` props from `DashboardAvailability`. Remove the entire controls headed by reminder preferences, including `Remind customer via WhatsApp`, `Notify supervisor in the dashboard`, and `Reminder delivery is simulated.`

Update the test helper to render only:

```tsx
<DashboardAvailability
  configuration={configuration}
  pending={false}
  onSaveWeekly={onSaveWeekly}
  onSaveOverride={onSaveOverride}
  onDeleteOverride={onDeleteOverride}
/>
```

Replace reminder mutation tests with:

```ts
expect(screen.queryByLabelText("Remind customer via WhatsApp")).toBeNull();
expect(screen.queryByLabelText("Notify supervisor in the dashboard")).toBeNull();
expect(screen.queryByText("Reminder delivery is simulated.")).toBeNull();
```

Remove `useDashboard` and reminder props from `routes/dashboard/availability.tsx`.

- [ ] **Step 9: Delete the demo provider and finish model cleanup**

In `routes/dashboard.tsx`, replace the authenticated return with:

```tsx
return <DashboardShell>{children}</DashboardShell>;
```

Remove the provider mock from `-dashboard-auth.test.tsx`. Delete the data/store files and the store test. Remove now-unused `DashboardState`, `ReminderSettings`, `CustomerNote`, and `CustomerActivity` types and reducer-only imports.

- [ ] **Step 10: Run focused cleanup tests and verify GREEN**

Run:

```powershell
npx vitest run src/features/dashboard/use-persisted-booking-data.test.tsx src/routes/-dashboard-index.test.tsx src/routes/-dashboard-auth.test.tsx src/features/dashboard/dashboard-overview.test.tsx src/features/dashboard/dashboard-availability.test.tsx src/features/dashboard/dashboard-customers.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx src/test/dashboard-runtime-data-contract.test.ts
```

Expected: PASS; no runtime demo/store file remains, overview data is persisted, and global reminder preferences are absent.

- [ ] **Step 11: Commit Task 7**

```powershell
git add src/routes/-dashboard-index.test.tsx src/test/dashboard-runtime-data-contract.test.ts src/features/dashboard/use-persisted-booking-data.ts src/features/dashboard/use-persisted-booking-data.test.tsx src/routes/dashboard/index.tsx src/features/dashboard/dashboard-overview.test.tsx src/features/dashboard/dashboard-availability.tsx src/features/dashboard/dashboard-availability.test.tsx src/routes/dashboard/availability.tsx src/routes/dashboard.tsx src/routes/-dashboard-auth.test.tsx src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-data.ts src/features/dashboard/dashboard-store.tsx src/features/dashboard/dashboard-store.test.tsx src/routes/dashboard/bookings.tsx src/routes/dashboard/customers/index.tsx 'src/routes/dashboard/customers/$id.tsx'
git commit -m "feat: load dashboard exclusively from postgres"
```

---

### Task 8: Full Verification and Live Database Acceptance

**Files:**
- Verify all files from Tasks 1–7.
- No production edits unless a verification failure is reproduced by a new failing test first.

**Interfaces:**
- Confirms the complete design and success criteria.

- [ ] **Step 1: Run all focused feature suites**

```powershell
npx vitest run src/features/book-call src/features/availability src/features/auth/admin.functions.test.ts src/features/dashboard src/routes/-dashboard-index.test.tsx src/routes/-dashboard-bookings.test.tsx src/routes/-dashboard-auth.test.tsx src/test/dashboard-runtime-data-contract.test.ts
```

Expected: PASS with zero failed tests and no unhandled promise warnings.

- [ ] **Step 2: Run the full automated suite**

```powershell
npm test
```

Expected: PASS with zero failed tests.

- [ ] **Step 3: Run static analysis and production build**

```powershell
npm run lint
npm run build
```

Expected: both commands exit 0. Existing unrelated warnings must be reported precisely; do not claim a clean verification if either command fails.

- [ ] **Step 4: Check formatting and scoped diff health**

```powershell
git diff --check
git status --short
$runtimeMatches = rg -n "demoDashboardState|DashboardProvider|reminders/update|Reminder delivery is simulated" src -g '!*.test.*'
if ($LASTEXITCODE -eq 0) { $runtimeMatches; throw "Runtime demo references remain." }
if ($LASTEXITCODE -gt 1) { throw "Runtime source scan failed." }
```

Expected: `git diff --check` exits 0; the source scan completes without throwing; status contains only intentional task files plus pre-existing unrelated user changes.

- [ ] **Step 5: Verify read-only live database prerequisites**

With `DATABASE_URL` available, confirm the required tables and columns without printing credentials:

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -c "SELECT to_regclass('public.customers') AS customers, to_regclass('public.appointments') AS appointments, to_regclass('public.weekly_availability_days') AS weekly_availability, to_regclass('public.availability_date_overrides') AS availability_overrides;"
```

Expected: all four values are non-null. If `psql` or credentials are unavailable, record live acceptance as pending rather than treating automated tests as deployment proof.

- [ ] **Step 6: Perform live administrator acceptance**

Run the app with the configured environment and verify:

1. Sign in as the configured administrator and open `/dashboard`; totals and rows match design appointments in Postgres and contain no sample names.
2. Open `/dashboard/bookings` and click `New appointment`; closed/past dates are disabled and only returned slots appear.
3. Create an appointment for an existing customer, reload the page, and confirm the same database ID/data remains visible.
4. Edit that appointment; its current slot remains selectable, occupied slots from other appointments do not.
5. Save an edit, reload, and confirm the persisted values.
6. Open a second browser session, occupy a displayed slot before the first dialog submits, then confirm the first dialog receives a stale-slot message and reloads availability without writing a duplicate.
7. Open `/dashboard/availability`; weekly hours and overrides remain functional, and global reminder-preference controls are absent.
8. Open `/dashboard/workshop-bookings`; workshop behavior is unchanged and workshop rows do not affect `/dashboard` metrics.

Expected: all eight checks pass.

- [ ] **Step 7: Stop and return defects to their owning TDD task**

Do not edit or commit from this verification step. Return any defect to the task that owns the affected interface, add the failing regression test there, implement the minimal fix, rerun that task's focused verification, and then rerun every Task 8 step. If no defect was found, create no commit.
