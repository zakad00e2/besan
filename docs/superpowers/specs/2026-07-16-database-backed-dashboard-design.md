# Database-Backed Dashboard Design

## Goal

Make Neon Postgres the only runtime source for design appointments and customers across the dashboard. Remove all runtime demo data and in-memory appointment mutations, persist administrator-created and edited appointments, and restrict appointment date/time selection to the canonical availability schedule.

## Scope

This change includes:

- database-backed data on the `/dashboard` overview;
- continued database-backed data on design bookings and customer pages;
- persisted administrator creation and editing of design appointments;
- an authenticated administrator availability projection for appointment forms;
- canonical server-side availability revalidation before every create or update;
- removal of `demoDashboardState`, `DashboardProvider`, and the dashboard reducer;
- removal of the temporary reminder-preferences section and its in-memory state;
- explicit loading, empty, authorization, validation, stale-slot, and storage-failure states;
- test-only fixtures that cannot be imported by runtime modules.

This change does not include workshop bookings in overview metrics, administrator availability overrides while booking, customer creation inside the appointment dialog, reminder-preference persistence, automated reminder delivery, or a dashboard-wide client cache.

## Data Ownership

Neon Postgres is the sole runtime source for dashboard design data:

- `public.customers` owns customer identity, contact details, production stage, and timestamps.
- `public.appointments` owns design appointment type, date, time, notes, status, reminder status, and timestamps.
- the existing availability tables own weekly hours, date overrides, timezone, and slot duration.

Workshop bookings remain in `public.workshop_bookings` and continue to appear only on the workshop page. They are intentionally excluded from `/dashboard` totals, comparisons, schedules, reminders, and status distribution.

Test data belongs in a test-only fixture module. No runtime module may import that fixture.

## Architecture

Keep the existing route-level loading pattern. `/dashboard`, `/dashboard/bookings`, `/dashboard/customers`, and `/dashboard/customers/$id` load persisted booking data through the existing authenticated server boundary and normalize it into the current `Customer` and `Appointment` view models.

Do not convert `DashboardProvider` into a remote cache and do not introduce React Query for this change. The current data volume and route structure do not justify a dashboard-wide cache. Each route owns its loading, failure, and retry state.

Remove `DashboardProvider` from the dashboard layout. The availability route no longer consumes dashboard context after reminder preferences are removed. The bookings route receives explicit asynchronous create and update callbacks instead of a reducer dispatch function.

Database credentials remain server-only. Every administrator read or mutation independently validates the Neon Auth token and configured administrator email before querying Postgres.

## Overview Data Flow

The `/dashboard` route uses `usePersistedBookingData` after an authenticated session is available. On success, it passes normalized customers and design appointments to `DashboardOverview`.

The persisted booking projection includes both `customers.created_at` and `customers.updated_at`. The normalized customer view model exposes these as `createdAt` and `updatedAt`: new-customer metrics use `createdAt`, while follow-up calculations use `updatedAt`. It does not infer customer creation from notes, activity placeholders, or the most recent appointment.

The existing pure metric helpers continue to calculate:

- design booking totals and month comparisons;
- today's design appointments;
- new customers, using each persisted customer's creation timestamp;
- customers that need follow-up;
- design appointment status distribution;
- today's or this week's design schedule;
- persisted per-appointment reminder progress.

The overview never falls back to demo data. It renders a skeleton while loading, an actionable retry state when loading fails, and genuine empty states when the database returns no appointments or customers.

## Administrator Appointment Availability

The administrator appointment dialog uses the same canonical availability rules as the public booking page:

- weekly availability windows;
- date-specific closures and custom hours;
- the configured timezone;
- the configured 60-minute slot duration;
- current time, so past dates and stale slots are unavailable;
- all non-cancelled appointments as occupied time.

The dialog replaces free-form date and time inputs with an availability-aware calendar and a list of returned slots. Only dates with at least one available slot are enabled. Selecting a date loads its current slots. Changing the date clears the selected time. The form cannot submit while availability is loading, after an availability failure, or without a returned slot selection.

Add authenticated administrator month/day availability server functions. They accept a token and an optional `excludeAppointmentId` for editing. The server authorizes the administrator before loading the projection.

For a new appointment, no appointment is excluded. For an edit, only the appointment being edited is removed from the occupied set. This keeps its current date and time selectable while every other active appointment continues to block overlap. The exclusion is performed server-side and is permitted only after authorization.

Public availability functions keep their current contract and never accept an appointment exclusion.

The client protects against stale request ordering: a response for an older month or date must not overwrite the most recent selection.

## Administrator Create and Update

Add two authenticated server operations:

- `createAdminBooking` creates a design appointment for an existing customer.
- `updateAdminBooking` updates an existing design appointment, including its customer, appointment type, date, time, notes, status, and reminder status.

Both operations validate:

- a non-empty authenticated administrator token;
- an existing customer UUID;
- an allowed design appointment type;
- a valid local date and time;
- an allowed booking status and reminder status;
- bounded, normalized notes;
- a slot returned by the canonical availability resolver immediately before the database write.

Update availability revalidation excludes only the appointment being updated. Create revalidation excludes nothing. A cancelled appointment does not occupy its former slot.

The repository uses parameterized SQL and returns the complete joined booking row after a successful write. A missing customer or appointment returns a safe `not-found` result. The existing active-slot database constraint remains the final concurrency guard and is translated to `slot-unavailable`.

The client may retain a local overlap check for immediate feedback, but it is never authoritative. If a slot becomes occupied after the dialog loads, the server rejects the mutation, the dialog remains open, the selected date's slots reload, and a specific availability message is shown.

While a mutation is pending, the dialog fields and submission controls are disabled to prevent repeat submission. On success, the route merges the returned persisted row into its local loaded data and closes the dialog. No temporary appointment ID or optimistic unpersisted row is created.

## Removal of Demo and In-Memory Behavior

Delete the runtime demo-data module and the dashboard context/reducer. Remove these local actions and all consumers:

- `appointment/add`;
- `appointment/update`;
- `customer/stage`;
- `customer/note`;
- `reminders/update`.

Customer stage changes that already occur through persisted booking workflows remain database-backed. Customer profile notes continue to be derived from persisted appointment notes. Empty legacy `Customer.notes` and `Customer.activity` fields should be removed from the runtime view model if no production consumer remains after the refactor.

Remove the reminder-preferences UI from the availability page, including the customer WhatsApp preference and supervisor-dashboard preference. Keep persisted per-appointment `reminder_status` behavior and the existing manual WhatsApp reminder action; those are booking data, not the removed global preferences.

Move reusable sample customers and appointments into a module located under the test directory or named with a test-only convention. Production files must not import it.

## Error and Empty States

User-facing errors are limited to safe business outcomes:

- the administrator session expired or is unauthorized;
- persisted dashboard data could not be loaded;
- availability could not be loaded;
- the selected customer or appointment no longer exists;
- the selected slot is no longer available;
- submitted fields are invalid;
- the database write failed and can be retried.

Raw SQL, database URLs, tokens, stack traces, and provider responses never reach the browser. Loading indicators use the existing dashboard visual language. Load failures provide a retry action. Empty database results render the existing dashboard empty-state components rather than sample content.

## Testing Strategy

Implementation follows red-green-refactor TDD. Every new production behavior begins with a focused failing test that fails for the expected missing behavior.

Coverage includes:

- a runtime source contract proving production modules do not import demo or test fixture data;
- overview route loading, persisted rendering, retryable failure, and empty results;
- overview metrics proving workshop rows are not included;
- administrator month/day availability authorization;
- creation showing only canonical open dates and unoccupied slots;
- editing excluding the current appointment while preserving conflicts from other appointments;
- stale month/day response protection;
- server-side create and update validation;
- server-side availability revalidation immediately before writes;
- repository parameterization, joined-row mapping, not-found handling, and active-slot conflict translation;
- dialog pending, success, validation, stale-slot, and storage-error behavior;
- successful create/update rows remaining visible after a fresh reload;
- removal of the reminder-preferences section and dashboard provider dependencies.

Final verification runs focused tests, the full Vitest suite, ESLint, a production build, and a diff check. Live database verification must confirm that an administrator-created or edited appointment survives a page reload and that an unavailable slot cannot be saved. If live credentials or migrations are unavailable, that limitation is reported separately from automated verification.

## Success Criteria

- No runtime module imports `demoDashboardState` or test fixtures.
- The dashboard layout no longer mounts an in-memory dashboard data provider.
- Every customer, appointment, metric, schedule row, status count, and reminder count on `/dashboard` comes from persisted design-booking data.
- Workshop bookings do not affect the overview.
- The availability page contains no temporary global reminder-preferences controls.
- The administrator create/edit dialog displays only canonical available dates and times.
- Editing keeps the appointment's own current slot selectable without freeing any other occupied slot.
- The server rejects closed, past, stale, or concurrently occupied slots.
- Administrator-created and edited appointments remain correct after a full page reload.
- Authentication and authorization protect every administrator read and mutation.
- No database credential or raw database error is exposed to the browser or committed to Git.
