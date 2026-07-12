# Neon Booking Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist `/book-call` requests in Neon Postgres, protect the dashboard with Neon Auth and a server-enforced admin allowlist, and render live booking data on every device.

**Architecture:** TanStack Start server functions are the only browser-accessible database boundary. Shared Zod domain code validates and normalizes booking data; a server-only repository uses `@neondatabase/serverless` with parameterized HTTP queries; Neon Auth issues short-lived JWTs that server functions verify with `jose` before any dashboard read.

**Tech Stack:** React 19, TanStack Start/Router, Neon Postgres, `@neondatabase/serverless`, Neon Auth (`@neondatabase/neon-js`, `@neondatabase/auth-ui`), Zod 3, Jose, Vitest, Testing Library.

## Global Constraints

- Keep `DATABASE_URL` and `ADMIN_EMAIL` server-only and never import the database connection from a browser module.
- The only authorized administrator email is configured as `z409483831@gmail.com` through `ADMIN_EMAIL`.
- Keep the public booking form unauthenticated and expose only fixed, validated insert behavior.
- Store the selected atelier day and time as PostgreSQL `date` and `time` values.
- Prevent two non-cancelled appointments from occupying the same date and time at the database level.
- Do not persist workshop modal bookings, demo customer profiles, overview metrics, availability, reminders, or dashboard editing in this release.
- Preserve unrelated user-owned working-tree changes and stage only files named by each task.
- Follow TDD for every behavior change: failing test, observed expected failure, minimal implementation, passing test, then refactor.

---

## File Structure

- `db/migrations/001_create_booking_tables.sql`: reproducible customer and appointment schema.
- `.env.example`: non-secret configuration contract.
- `src/features/book-call/booking-domain.ts`: shared constants, schemas, normalization, and serializable result types.
- `src/features/book-call/booking-domain.test.ts`: domain validation and normalization tests.
- `src/features/book-call/booking-repository.server.ts`: parameterized Neon queries and database-error translation.
- `src/features/book-call/booking-repository.server.test.ts`: repository behavior with an injected query boundary.
- `src/features/book-call/booking-service.ts`: dependency-injected submit and list use cases, safe for unit tests.
- `src/features/book-call/booking-service.test.ts`: service success and sanitized failure tests.
- `src/features/book-call/booking.functions.ts`: TanStack Start server-function wrappers.
- `src/features/auth/neon-auth-client.ts`: browser Neon Auth client.
- `src/features/auth/admin-auth.ts`: pure admin-email authorization.
- `src/features/auth/admin-auth.test.ts`: allowlist tests.
- `src/features/auth/admin-auth.server.ts`: JWT signature, issuer, audience, expiry, and admin checks.
- `src/features/auth/admin-auth.server.test.ts`: verifier-boundary tests through dependency injection.
- `src/features/auth/admin.functions.ts`: admin access and protected booking-list server functions.
- `src/features/auth/admin-gate.tsx`: signed-in/admin loading, denied, and allowed states.
- `src/features/auth/admin-gate.test.tsx`: dashboard gate behavior.
- `src/routes/auth.$pathname.tsx`: Neon Auth sign-in/sign-up/account views.
- `src/routes/book-call.tsx`: submit validated form data and render server outcomes.
- `src/routes/book-call.test.tsx`: booking-form interaction regression tests.
- `src/routes/__root.tsx`: install the Neon Auth UI provider.
- `src/routes/dashboard.tsx`: put all dashboard routes behind `AdminGate`.
- `src/routes/dashboard/bookings.tsx`: query and pass live bookings.
- `src/features/dashboard/dashboard-bookings.tsx`: render and filter the live booking view model.
- `src/features/dashboard/dashboard-bookings.test.tsx`: live table, filters, notes, WhatsApp, and responsive data tests.

---

### Task 1: Provision Neon and Commit the Reproducible Schema

**Files:**
- Create: `db/migrations/001_create_booking_tables.sql`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: Connected Neon organization `org-cold-union-26518648`.
- Produces: Neon project `besan2`, provisioned Auth URL, `DATABASE_URL`, and database tables used by all later tasks.

- [ ] **Step 1: Create the Neon project and provision Auth**

Use the connected Neon tools to create project `besan2` in `org-cold-union-26518648`, describe the project to obtain its default branch and database, then provision Neon Auth on that branch. Retrieve a pooled connection string for application runtime. Do not print or commit the returned password.

Expected: one project, one default branch, database `neondb`, an Auth URL, and a pooled connection string.

- [ ] **Step 2: Add the migration file**

Create `db/migrations/001_create_booking_tables.sql` with:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  mobile text NOT NULL UNIQUE CHECK (char_length(mobile) BETWEEN 7 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  appointment_type text NOT NULL CHECK (
    appointment_type IN ('New Design', 'First Fitting', 'Second Fitting', 'Alteration', 'Pickup')
  ),
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'completed', 'cancelled')
  ),
  reminder_status text NOT NULL DEFAULT 'not-scheduled' CHECK (
    reminder_status IN ('not-scheduled', 'scheduled', 'sent')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_customer_id_idx
  ON public.appointments (customer_id);

CREATE INDEX IF NOT EXISTS appointments_created_at_idx
  ON public.appointments (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_unique
  ON public.appointments (appointment_date, appointment_time)
  WHERE status <> 'cancelled';
```

- [ ] **Step 3: Prepare and review the migration on a temporary Neon branch**

Call Neon's safe migration preparation with the exact SQL file content. Inspect the returned schema diff and verify it contains only `public.customers`, `public.appointments`, their constraints, and three indexes. Apply the prepared migration to the main branch and clean up the temporary branch only after that review.

Expected: migration completion succeeds and a fresh schema description contains both tables without altering the `neon_auth` schema.

- [ ] **Step 4: Add environment and secret-ignore contracts**

Append to `.gitignore`:

```gitignore
# Local environment secrets
.env
.env.*
!.env.example
```

Create `.env.example`:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
VITE_NEON_AUTH_URL=https://YOUR-AUTH-HOST/neondb/auth
ADMIN_EMAIL=z409483831@gmail.com
```

Create an ignored local `.env` from the actual connector values for verification. Never stage `.env`.

- [ ] **Step 5: Install runtime dependencies**

Run:

```powershell
npm install @neondatabase/serverless @neondatabase/neon-js @neondatabase/auth-ui jose
```

Expected: exit 0 and only `package.json` plus `package-lock.json` change.

- [ ] **Step 6: Verify configuration and schema**

Run:

```powershell
git check-ignore .env
git check-ignore .env.example
rg -n "DATABASE_URL|VITE_NEON_AUTH_URL|ADMIN_EMAIL" .env.example
```

Expected: `.env` is ignored, `.env.example` is not ignored, and all three variable names are present.

- [ ] **Step 7: Commit**

```powershell
git add -- .gitignore .env.example package.json package-lock.json db/migrations/001_create_booking_tables.sql
git commit -m "chore: provision Neon booking storage"
```

---

### Task 2: Define and Validate the Booking Domain

**Files:**
- Create: `src/features/book-call/booking-domain.test.ts`
- Create: `src/features/book-call/booking-domain.ts`

**Interfaces:**
- Consumes: Raw serializable `/book-call` values.
- Produces: `BookingInput`, `ValidatedBooking`, `BookingListItem`, `parseBookingInput(input)`, and `formatBookingDate(date)`.

- [ ] **Step 1: Write failing domain tests**

Cover this public contract:

```ts
const valid = {
  appointmentType: "First Fitting",
  appointmentDate: "2026-07-13",
  appointmentTime: "10:00",
  fullName: "  Noor Al-Hashemi  ",
  mobile: " +970 59-123-4567 ",
  notes: "  Bring reference photos  ",
};

expect(parseBookingInput(valid)).toEqual({
  success: true,
  data: {
    appointmentType: "First Fitting",
    appointmentDate: "2026-07-13",
    appointmentTime: "10:00",
    fullName: "Noor Al-Hashemi",
    mobile: "+970591234567",
    notes: "Bring reference photos",
  },
});

expect(parseBookingInput({ ...valid, appointmentDate: "2026-07-12" })).toMatchObject({
  success: false,
  fieldErrors: { appointmentDate: expect.any(String) },
});

expect(parseBookingInput({ ...valid, appointmentTime: "11:15" })).toMatchObject({
  success: false,
  fieldErrors: { appointmentTime: expect.any(String) },
});
```

Also assert rejection of unknown appointment types, empty name/mobile, a mobile outside 7–20 normalized characters, and notes over 1000 characters. Assert `formatBookingDate(new Date(2026, 6, 13)) === "2026-07-13"` so local dates never pass through UTC conversion.

- [ ] **Step 2: Run tests and observe the expected failure**

```powershell
npm test -- src/features/book-call/booking-domain.test.ts
```

Expected: FAIL because `booking-domain.ts` does not exist.

- [ ] **Step 3: Implement the domain module**

Define the exact types and constants:

```ts
export const appointmentTypes = [
  "New Design",
  "First Fitting",
  "Second Fitting",
  "Alteration",
  "Pickup",
] as const;

export const timesByDay = {
  Monday: ["10:00", "12:30", "16:00"],
  Tuesday: ["11:00", "14:00", "17:30"],
  Wednesday: ["10:30", "13:00", "16:30"],
  Thursday: ["12:00", "15:00", "18:00"],
  Saturday: ["10:00", "12:00", "14:30"],
} as const;

export type BookingInput = {
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  fullName: string;
  mobile: string;
  notes: string;
};

export type ValidatedBooking = Omit<BookingInput, "appointmentType"> & {
  appointmentType: (typeof appointmentTypes)[number];
};

export type BookingListItem = ValidatedBooking & {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  reminderStatus: "not-scheduled" | "scheduled" | "sent";
  createdAt: string;
};
```

Use Zod for lengths and allowed appointment types. Normalize names/notes with `trim()`, normalize mobile by preserving one leading `+` and removing other non-digits, derive the English weekday from `${appointmentDate}T12:00:00Z`, and require the selected time to occur in `timesByDay[weekday]`. Return serializable field errors rather than throwing.

- [ ] **Step 4: Run domain tests**

```powershell
npm test -- src/features/book-call/booking-domain.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/features/book-call/booking-domain.ts src/features/book-call/booking-domain.test.ts
git commit -m "feat: validate booking requests"
```

---

### Task 3: Implement the Server-Only Neon Repository and Use Cases

**Files:**
- Create: `src/features/book-call/booking-repository.server.test.ts`
- Create: `src/features/book-call/booking-repository.server.ts`
- Create: `src/features/book-call/booking-service.test.ts`
- Create: `src/features/book-call/booking-service.ts`

**Interfaces:**
- Consumes: `ValidatedBooking` and a parameterized `QueryExecutor`.
- Produces: `createBookingRepository(executor)`, `neonBookingRepository`, `submitBookingRequest(input, repository)`, and `listBookingRequests(repository)`.

- [ ] **Step 1: Write failing repository tests**

Define an injected boundary and assert behavior rather than mocking Neon internals:

```ts
export type QueryExecutor = <T>(query: string, params?: unknown[]) => Promise<T[]>;

const execute = vi.fn<QueryExecutor>().mockResolvedValue([{ id: "appointment-1" }]);
const repository = createBookingRepository(execute);
const result = await repository.create(validatedBooking);

expect(result).toEqual({ success: true, appointmentId: "appointment-1" });
expect(execute).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT (mobile)"), [
  "Noor Al-Hashemi",
  "+970591234567",
  "First Fitting",
  "2026-07-13",
  "10:00",
  "Bring reference photos",
]);
```

Add a test where the executor rejects with `{ code: "23505", constraint: "appointments_active_slot_unique" }` and expect `{ success: false, reason: "slot-unavailable" }`. Add a list test that maps snake-case rows to `BookingListItem` and verifies `ORDER BY appointment_date DESC, appointment_time DESC, created_at DESC`.

- [ ] **Step 2: Run repository tests and observe failure**

```powershell
npm test -- src/features/book-call/booking-repository.server.test.ts
```

Expected: FAIL because the repository module does not exist.

- [ ] **Step 3: Implement the repository**

Create one atomic CTE query for writes:

```sql
WITH saved_customer AS (
  INSERT INTO public.customers (full_name, mobile)
  VALUES ($1, $2)
  ON CONFLICT (mobile) DO UPDATE
    SET full_name = EXCLUDED.full_name, updated_at = now()
  RETURNING id
)
INSERT INTO public.appointments (
  customer_id, appointment_type, appointment_date, appointment_time, notes
)
SELECT id, $3, $4::date, $5::time, $6
FROM saved_customer
RETURNING id
```

Use this read query:

```sql
SELECT
  a.id,
  c.full_name,
  c.mobile,
  a.appointment_type,
  a.appointment_date::text,
  to_char(a.appointment_time, 'HH24:MI') AS appointment_time,
  a.notes,
  a.status,
  a.reminder_status,
  a.created_at::text
FROM public.appointments a
JOIN public.customers c ON c.id = a.customer_id
ORDER BY a.appointment_date DESC, a.appointment_time DESC, a.created_at DESC
```

Create the production executor with `neon(process.env.DATABASE_URL!)` and `sql.query(query, params)`. Throw a configuration error when `DATABASE_URL` is absent. Translate only the named unique constraint to `slot-unavailable`; log other errors server-side and return `storage-error` without raw SQL text.

- [ ] **Step 4: Run repository tests**

```powershell
npm test -- src/features/book-call/booking-repository.server.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing service tests**

Assert that `submitBookingRequest` does not call the repository for invalid input, returns `{ success: false, reason: "validation", fieldErrors }`, returns the appointment ID for success, preserves `slot-unavailable`, and converts unexpected repository exceptions to `{ success: false, reason: "storage-error" }`. Assert `listBookingRequests` returns repository rows unchanged.

- [ ] **Step 6: Run service tests and observe failure**

```powershell
npm test -- src/features/book-call/booking-service.test.ts
```

Expected: FAIL because `booking-service.ts` does not exist.

- [ ] **Step 7: Implement the use cases**

```ts
export async function submitBookingRequest(
  input: BookingInput,
  repository: Pick<BookingRepository, "create">,
): Promise<BookingSubmissionResult> {
  const parsed = parseBookingInput(input);
  if (!parsed.success) return { success: false, reason: "validation", fieldErrors: parsed.fieldErrors };
  try {
    return await repository.create(parsed.data);
  } catch (error) {
    console.error(error);
    return { success: false, reason: "storage-error" };
  }
}

export async function listBookingRequests(
  repository: Pick<BookingRepository, "list">,
): Promise<BookingListItem[]> {
  return repository.list();
}
```

- [ ] **Step 8: Run repository and service tests**

```powershell
npm test -- src/features/book-call/booking-repository.server.test.ts src/features/book-call/booking-service.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add -- src/features/book-call/booking-repository.server.ts src/features/book-call/booking-repository.server.test.ts src/features/book-call/booking-service.ts src/features/book-call/booking-service.test.ts
git commit -m "feat: persist Neon booking requests"
```

---

### Task 4: Submit `/book-call` Through a Server Function

**Files:**
- Create: `src/features/book-call/booking.functions.ts`
- Create: `src/routes/book-call.test.tsx`
- Modify: `src/routes/book-call.tsx`

**Interfaces:**
- Consumes: `BookingInput`, `submitBookingRequest`, and `neonBookingRepository`.
- Produces: `submitBooking({ data: BookingInput })` and a form that displays validation, duplicate-slot, storage, pending, and success states.

- [ ] **Step 1: Create the server-function wrapper**

```ts
export const submitBooking = createServerFn({ method: "POST" })
  .validator((data: BookingInput) => data)
  .handler(({ data }) => submitBookingRequest(data, neonBookingRepository));
```

Keep the wrapper in a `.functions.ts` file and statically import the `.server.ts` repository; TanStack Start replaces the client import with an RPC stub.

- [ ] **Step 2: Write failing form interaction tests**

Mock `submitBooking`, render the route component, select a valid day/time, fill name, mobile, and notes, and submit. Assert the function receives all six fields and the success message appears. Add tests for:

```ts
{ success: false, reason: "slot-unavailable" }
{ success: false, reason: "storage-error" }
{ success: false, reason: "validation", fieldErrors: { mobile: "Enter a valid mobile number." } }
```

Assert the submit button is disabled while the promise is pending and a second click does not create a second call.

- [ ] **Step 3: Run the form tests and observe failure**

```powershell
npm test -- src/routes/book-call.test.tsx
```

Expected: FAIL because the route still only toggles local `submitted` state.

- [ ] **Step 4: Implement the form submission**

Move appointment constants to `booking-domain.ts`, export the route component as `BookCall` for direct interaction tests, use `formatBookingDate(selectedDate)`, and replace the synchronous handler with:

```ts
const [submitting, setSubmitting] = useState(false);
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (submitting) return;
  const formData = new FormData(event.currentTarget);
  setSubmitting(true);
  setSubmitted(false);
  setError("");
  try {
    const result = await submitBooking({
      data: {
        appointmentType,
        appointmentDate: selectedDate ? formatBookingDate(selectedDate) : "",
        appointmentTime: selectedTime,
        fullName: String(formData.get("fullName") ?? ""),
        mobile: String(formData.get("mobile") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      },
    });
    if (result.success) {
      setSubmitted(true);
      setFieldErrors({});
    } else if (result.reason === "validation") {
      setFieldErrors(result.fieldErrors);
      setError("Please review the highlighted details.");
    } else {
      setError(
        result.reason === "slot-unavailable"
          ? "That time was just booked. Please choose another time."
          : "We could not save your booking. Please try again.",
      );
    }
  } finally {
    setSubmitting(false);
  }
}
```

Render field-level messages with `aria-describedby`, give the error summary `role="alert"`, give success `role="status"`, and change the button label to `Saving booking…` while disabled.

- [ ] **Step 5: Run form and domain tests**

```powershell
npm test -- src/routes/book-call.test.tsx src/features/book-call/booking-domain.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/features/book-call/booking.functions.ts src/routes/book-call.tsx src/routes/book-call.test.tsx
git commit -m "feat: submit public bookings to Neon"
```

---

### Task 5: Add Neon Auth and Server-Enforced Admin Authorization

**Files:**
- Create: `src/features/auth/neon-auth-client.ts`
- Create: `src/features/auth/admin-auth.test.ts`
- Create: `src/features/auth/admin-auth.ts`
- Create: `src/features/auth/admin-auth.server.test.ts`
- Create: `src/features/auth/admin-auth.server.ts`
- Create: `src/features/auth/admin.functions.ts`
- Create: `src/features/auth/admin-gate.test.tsx`
- Create: `src/features/auth/admin-gate.tsx`
- Create: `src/routes/auth.$pathname.tsx`
- Modify: `src/routes/__root.tsx`
- Modify: `src/routes/dashboard.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Neon Auth JWT from `authClient.token()` and `ADMIN_EMAIL`.
- Produces: `isAdminEmail(email, configuredEmail)`, `verifyAdminToken(token)`, `checkAdminAccess`, and `AdminGate`.

- [ ] **Step 1: Write failing pure authorization tests**

```ts
expect(isAdminEmail(" Z409483831@gmail.com ", "z409483831@gmail.com")).toBe(true);
expect(isAdminEmail("other@example.com", "z409483831@gmail.com")).toBe(false);
expect(() => requireConfiguredAdminEmail(undefined)).toThrow("ADMIN_EMAIL is not configured");
```

- [ ] **Step 2: Run and observe failure**

```powershell
npm test -- src/features/auth/admin-auth.test.ts
```

Expected: FAIL because `admin-auth.ts` does not exist.

- [ ] **Step 3: Implement pure authorization**

Normalize both emails with `trim().toLocaleLowerCase("en-US")`; never return the configured administrator email to the browser.

- [ ] **Step 4: Write failing JWT verifier tests**

Inject a `verifyJwt(token)` dependency returning claims. Assert `verifyAdminTokenWith` accepts `{ email: "z409483831@gmail.com", sub: "user-1" }`, rejects missing email, rejects another email, and converts signature/expiry errors to `{ allowed: false }` without exposing verifier details.

- [ ] **Step 5: Run and observe failure**

```powershell
npm test -- src/features/auth/admin-auth.server.test.ts
```

Expected: FAIL because `admin-auth.server.ts` does not exist.

- [ ] **Step 6: Implement JWT verification**

Use:

```ts
const authUrl = process.env.VITE_NEON_AUTH_URL;
const origin = new URL(authUrl).origin;
const jwks = createRemoteJWKSet(new URL(`${authUrl}/.well-known/jwks.json`));
const { payload } = await jwtVerify(token, jwks, {
  issuer: origin,
  audience: origin,
  algorithms: ["EdDSA"],
});
```

Then compare `payload.email` to `ADMIN_EMAIL`. Cache the remote JWKS object at module scope and return only `{ allowed: boolean, userId?: string }`.

- [ ] **Step 7: Add the auth client and UI provider**

```ts
export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
});
```

Import `@neondatabase/auth-ui/tailwind` immediately after the Tailwind import in `src/styles.css`. Wrap the root outlet with `NeonAuthUIProvider`, and create `/auth/$pathname` with `<AuthView pathname={pathname} />` centered in the existing visual system.

- [ ] **Step 8: Create the admin access server function**

```ts
export const checkAdminAccess = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => verifyAdminToken(data.token));
```

- [ ] **Step 9: Write failing gate tests**

Mock the auth client and `checkAdminAccess`. Assert loading state while session/token checks run, redirect-to-sign-in for no session, access denied for `{ allowed: false }`, and children render only for `{ allowed: true }`.

- [ ] **Step 10: Run gate tests and observe failure**

```powershell
npm test -- src/features/auth/admin-gate.test.tsx
```

Expected: FAIL because `AdminGate` does not exist.

- [ ] **Step 11: Implement and install the dashboard gate**

`AdminGate` uses `authClient.useSession()`, calls `authClient.token()`, then calls `checkAdminAccess`. Render `RedirectToSignIn` for signed-out state, a neutral dashboard loading screen while checking, and an access-denied screen for a signed-in non-admin. Wrap the existing `DashboardProvider` and `DashboardShell` inside this gate in `src/routes/dashboard.tsx`.

- [ ] **Step 12: Run auth tests**

```powershell
npm test -- src/features/auth/admin-auth.test.ts src/features/auth/admin-auth.server.test.ts src/features/auth/admin-gate.test.tsx
```

Expected: PASS.

- [ ] **Step 13: Commit**

```powershell
git add -- src/features/auth src/routes/__root.tsx src/routes/dashboard.tsx 'src/routes/auth.$pathname.tsx' src/styles.css
git commit -m "feat: protect dashboard with Neon Auth"
```

---

### Task 6: Load and Display Live Neon Bookings

**Files:**
- Modify: `src/features/auth/admin.functions.ts`
- Modify: `src/routes/dashboard/bookings.tsx`
- Modify: `src/features/dashboard/dashboard-bookings.tsx`
- Modify: `src/features/dashboard/dashboard-bookings.test.tsx`

**Interfaces:**
- Consumes: `BookingListItem[]`, verified admin JWT, and `listBookingRequests`.
- Produces: protected `getBookings({ data: { token } })` plus live filtering and rendering.

- [ ] **Step 1: Add a protected list server function**

```ts
export const getBookings = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const access = await verifyAdminToken(data.token);
    if (!access.allowed) return { success: false as const, reason: "forbidden" as const };
    try {
      return {
        success: true as const,
        bookings: await listBookingRequests(neonBookingRepository),
      };
    } catch (error) {
      console.error(error);
      return { success: false as const, reason: "load-error" as const };
    }
  });
```

- [ ] **Step 2: Rewrite the existing component tests first**

Use `BookingListItem[]` fixtures and assert:

- customer name, mobile, all five appointment-type labels, date, time, notes, status, reminder, and submission time render;
- query matches customer name, mobile, type, and notes;
- type, status, and date filters work;
- the WhatsApp link contains digits only;
- no `New appointment` or edit button is present;
- empty live rows render `No bookings yet` rather than demo records.

Preserve valid assertions covering the current responsive desktop table and mobile list.

- [ ] **Step 3: Run the dashboard bookings tests and observe failure**

```powershell
npm test -- src/features/dashboard/dashboard-bookings.test.tsx
```

Expected: FAIL because the component still consumes in-memory `Customer[]` and `Appointment[]` and exposes prototype mutations.

- [ ] **Step 4: Implement live filters and rendering**

Change `DashboardBookings` to:

```ts
export function DashboardBookings({ bookings }: { bookings: BookingListItem[] })
```

Define filters as query, one of the five appointment types or `all`, status or `all`, and date or `all`. Remove `dispatch`, `openNewOnMount`, dialog state, validation, New appointment, and Edit controls. Add Notes and Submitted columns on desktop and the equivalent content on mobile. Retain the WhatsApp link and accessible labels. Use `createdAt` only for display and stable sorting; never infer appointment time from it.

- [ ] **Step 5: Implement route loading states**

In `src/routes/dashboard/bookings.tsx`, use React Query with key `['dashboard-bookings', session.user.id]`. The query function retrieves a fresh JWT through `authClient.token()` and calls `getBookings`. Render skeleton/loading, access denied, retryable load error with a Retry button, then `<DashboardBookings bookings={result.bookings} />`.

- [ ] **Step 6: Run focused dashboard tests**

```powershell
npm test -- src/features/dashboard/dashboard-bookings.test.tsx src/features/auth/admin-gate.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Run the whole dashboard regression set**

```powershell
npm test -- src/features/dashboard
```

Expected: PASS. If tests that intentionally cover the old in-memory create/edit booking prototype fail, update or remove only those obsolete assertions; do not weaken unrelated dashboard tests.

- [ ] **Step 8: Commit**

```powershell
git add -- src/features/auth/admin.functions.ts src/routes/dashboard/bookings.tsx src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx
git commit -m "feat: show live Neon bookings"
```

---

### Task 7: Verify the Full Integration

**Files:**
- Modify only if verification reveals a defect in a file already owned by Tasks 1–6.

**Interfaces:**
- Consumes: Completed Neon project, local ignored `.env`, application code, and tests.
- Produces: Evidence that the booking, authorization, database, UI, and build paths work together.

- [ ] **Step 1: Run focused feature tests**

```powershell
npm test -- src/features/book-call src/features/auth src/routes/book-call.test.tsx src/features/dashboard/dashboard-bookings.test.tsx
```

Expected: all focused tests pass with zero unhandled errors.

- [ ] **Step 2: Run the full automated suite**

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Run lint and production build**

```powershell
npm run lint
npm run build
```

Expected: both commands exit 0 with no ESLint errors and a complete production bundle.

- [ ] **Step 4: Verify secrets are not tracked or bundled**

```powershell
git status --short
git ls-files .env
rg -n "postgresql://[^ ]+@|z409483831@gmail.com" src public .output -g '!*.map'
```

Expected: `.env` is absent from tracked files, no connection string occurs in source or browser output, and the admin address occurs only in `.env.example` or documentation—not in `src`, `public`, or the production bundle.

- [ ] **Step 5: Run a real cross-device data smoke test**

Start the app with the ignored local environment. Use the Neon Auth sign-up screen to create the first administrator as `z409483831@gmail.com`, then submit one uniquely named future booking through `/book-call` and confirm through Neon SQL:

```sql
SELECT c.full_name, c.mobile, a.appointment_type, a.appointment_date,
       a.appointment_time, a.notes, a.status, a.created_at
FROM public.appointments a
JOIN public.customers c ON c.id = a.customer_id
ORDER BY a.created_at DESC
LIMIT 1;
```

Expected: the submitted values match and status is `pending`. Sign in as `z409483831@gmail.com` in a separate browser profile and confirm the row appears in `/dashboard/bookings`. Sign out and confirm the dashboard redirects to sign-in. Sign in with a non-admin test account and confirm no dashboard content or booking data appears.

- [ ] **Step 6: Verify duplicate-slot behavior**

Submit a second request for the same date and time.

Expected: the form reports that the slot is unavailable and the database contains exactly one non-cancelled appointment for that slot.

- [ ] **Step 7: Review the final diff**

```powershell
git diff HEAD~6 --check
git status --short
```

Expected: no whitespace errors, no secrets, and no unrelated user-owned files staged or committed.

- [ ] **Step 8: Commit verification-only fixes if any**

If verification required code changes, repeat the failing test and all relevant checks, then commit only those files:

```powershell
git add -- .gitignore .env.example package.json package-lock.json db/migrations/001_create_booking_tables.sql src/features/book-call src/features/auth src/routes/book-call.tsx src/routes/book-call.test.tsx src/routes/__root.tsx src/routes/dashboard.tsx src/routes/dashboard/bookings.tsx src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx src/styles.css
git commit -m "fix: harden Neon booking integration"
```

If no fixes were required, do not create an empty commit.

---

## Production Follow-up Checklist

Before public production launch, configure the final application domain as a trusted Neon Auth domain, use a production SMTP provider, decide and enable the email-verification policy, and disable localhost access on the production Auth branch. Those console settings require the final deployment domain and SMTP credentials and therefore remain explicit deployment follow-ups rather than hidden assumptions in application code.
