# Database-Backed Availability Design

**Date:** 2026-07-15

**Status:** Approved for specification

## Goal

Make the dashboard Availability page the database-backed source of truth for the public appointment calendar. Give the supervisor flexible control over recurring weekly hours, date-specific hours, and multi-day closures while preserving existing bookings.

## Scope

This change includes:

- Persisting availability configuration in Neon Postgres.
- A recurring seven-day weekly schedule with one or more working windows per day.
- Default availability on every day except Thursday, from 11:00 to 17:00.
- A fixed appointment duration of 60 minutes.
- Single-day custom-hour overrides.
- Inclusive multi-day closures for travel or other leave, with an optional note.
- Database-backed administration from `/dashboard/availability`.
- Public available-date and available-time reads for `/book-call`.
- Authoritative server-side availability validation during booking creation.
- Preservation of existing bookings with conflict warnings when availability is closed around them.
- Overlap protection for concurrent appointment submissions.

This change does not include reminder-setting persistence, automatic cancellation or rescheduling, multiple staff calendars, variable appointment durations, customer-facing waitlists, or recurring holiday rules.

## Approved Scheduling Model

Use a recurring weekly schedule plus date overrides.

For any requested local atelier date, the resolver applies the following precedence:

1. A closure whose inclusive date range contains the requested date makes the whole date unavailable.
2. A single-day custom-hours override replaces the recurring hours for that date.
3. When no date override applies, the resolver uses the recurring hours for that weekday.
4. The selected windows are divided into consecutive 60-minute slots.
5. Slots that overlap an active appointment are removed.

Overlapping date overrides are rejected so that the resolver never has to guess which rule wins. To reopen one day inside a closure range, the supervisor must split or shorten the closure and add the desired single-day custom hours.

The business timezone is `Asia/Jerusalem`. Appointment dates and times remain stored as local `date` and `time` values, matching the current booking schema. Timezone-aware calculations, including whether a date is in the past and which weekday it represents, use `Asia/Jerusalem`.

## Default Configuration

The migration seeds one singleton availability setting and all seven weekday records:

| Day       | Enabled | Windows       |
| --------- | ------- | ------------- |
| Sunday    | Yes     | 11:00-17:00   |
| Monday    | Yes     | 11:00-17:00   |
| Tuesday   | Yes     | 11:00-17:00   |
| Wednesday | Yes     | 11:00-17:00   |
| Thursday  | No      | 11:00-17:00   |
| Friday    | Yes     | 11:00-17:00   |
| Saturday  | Yes     | 11:00-17:00   |

An enabled 11:00-17:00 window produces six slots: 11:00, 12:00, 13:00, 14:00, 15:00, and 16:00. Every slot ends one hour after its start.

## Database Design

The logical model is implemented with normalized tables so day state, windows, overrides, and override windows can be validated independently.

### `availability_settings`

A singleton row containing:

- `timezone`, fixed initially to `Asia/Jerusalem`;
- `slot_duration_minutes`, fixed initially to `60`;
- standard creation and update timestamps.

The UI displays these values but does not expose duration editing in this release.

### `weekly_availability_days`

One row for each weekday, containing:

- weekday number using one documented Sunday-through-Saturday convention;
- `is_enabled`;
- an update timestamp.

A disabled day retains its child windows so reopening the day restores the supervisor's last configured hours.

### `weekly_availability_windows`

Zero or more rows for each weekday, containing:

- start time;
- end time;
- stable display order.

Windows must not overlap, must be at least 60 minutes long, and their length must be divisible by 60 minutes. Start and end controls use 30-minute increments, allowing schedules such as 11:30-17:30 while preserving one-hour appointments.

### `availability_date_overrides`

An override contains:

- `kind`, either `closed` or `custom-hours`;
- inclusive `starts_on` and `ends_on` local dates;
- an optional supervisor note;
- standard creation and update timestamps.

`custom-hours` requires `starts_on = ends_on`. `closed` may span one or more days. Override ranges may not overlap one another.

### `availability_date_windows`

Zero or more windows belonging to a `custom-hours` override. They follow the same duration, divisibility, ordering, and non-overlap rules as weekly windows. Closed overrides cannot have child windows.

## Appointment Overlap Protection

All appointments have a fixed effective duration of 60 minutes. Existing records, including appointments beginning at half past the hour, retain their stored start times and are treated as occupying the following full hour.

The current exact-start unique index is not sufficient because an existing 12:30 appointment overlaps a proposed 12:00 appointment. The migration therefore adds a partial Postgres exclusion constraint over each active appointment's local timestamp range. Cancelled appointments do not block availability.

Before adding that constraint, the migration checks for existing overlapping active appointments. If any exist, the migration fails with a clear diagnostic and does not alter or cancel them. The records must be reviewed manually before retrying the migration.

The repository translates an exclusion-constraint conflict into the existing `slot-unavailable` business result. This protects concurrent requests even when both clients saw the slot as available moments earlier.

## Availability Resolution Service

A pure domain module owns validation and deterministic slot generation. It accepts a local date, the relevant weekly day and windows, a matching override if present, active appointments, and the 60-minute duration. It returns normalized slots without browser or database dependencies.

The server repository owns persistence and purpose-built queries:

- load the full administrative schedule and upcoming overrides;
- replace a weekly schedule transactionally;
- create, update, or delete an override transactionally;
- count active bookings affected by a proposed schedule or override change;
- list public open dates for a requested calendar month;
- list public unbooked slots for one local date;
- revalidate one requested slot during appointment creation.

The public read result includes only dates, start times, and end times. It never exposes supervisor notes, administrator settings, booking counts, customer information, or database identifiers that are not needed by the form.

## Dashboard Administration Flow

`/dashboard/availability` loads the persisted schedule after the existing administrator session and email checks. It does not fall back to demo availability if loading fails.

### Weekly schedule editor

The editor renders all seven days. Each day has:

- an open/closed switch;
- one or more start/end window rows;
- controls to add or remove a window;
- inline validation for incomplete, overlapping, too-short, or non-divisible windows.

The supervisor makes a draft locally and explicitly selects `Save weekly schedule`. The server validates the entire schedule and returns the count and identity of active bookings that would fall outside the new schedule. When conflicts exist, the UI presents a confirmation warning. Confirming saves the availability change but does not mutate those bookings.

### Closures and custom hours

`Add date exception` opens a form with two modes:

- `Day off`: choose an inclusive start and end date and an optional reason such as travel.
- `Custom hours`: choose one date and one or more working windows.

Upcoming overrides appear in a chronological list with edit and delete actions. A multi-day closure is shown as one item. Before creating, updating, or deleting an override, the server reports affected active bookings. The confirmation warning includes the number of bookings and links to `/dashboard/bookings`; it never offers automatic cancellation.

Successful mutations refresh the canonical server data and show a short success toast. While a mutation is pending, the affected save action is disabled to prevent repeat submission.

The existing reminder controls remain visibly separate and retain their current simulated behavior. They are not presented as database-backed by this feature.

## Public Booking Flow

The `/book-call` calendar no longer imports fixed weekday and time arrays.

1. The calendar requests open dates for the visible month.
2. Past dates in `Asia/Jerusalem`, closed dates, and dates with no remaining slots are disabled.
3. Selecting an open date requests its currently available 60-minute slots.
4. Selecting a different date clears the previously selected time.
5. Submitting the form sends the local date and time through the existing booking server function.
6. The booking service validates the fields, resolves availability again, and attempts the insert under database overlap protection.
7. If the slot closed or was booked in the meantime, the form preserves the customer's entered details, clears the unavailable time, refreshes that date's slots, and asks the customer to choose again.

Public availability failures disable date/time selection and show a retry action. The form never falls back to hard-coded slots because that would allow bookings outside the supervisor's saved schedule.

## Authorization and Trust Boundaries

Administrative availability reads and writes reuse the existing server-side admin verification. A protected dashboard route is not considered sufficient authorization; every administrative server function verifies the supplied session token before accessing availability data.

Public availability reads require no sign-in but expose a narrow read model. Booking creation remains public and insert-only. The server treats the requested time as untrusted and never creates an appointment unless the same shared resolver confirms it is currently valid.

## Validation and Error Handling

The server is authoritative for every rule. Client validation mirrors the rules only for fast feedback.

- A schedule save is all-or-nothing.
- An override mutation is all-or-nothing.
- End dates cannot precede start dates.
- Weekly and custom windows cannot overlap.
- Each window must fit complete 60-minute slots.
- Date overrides cannot overlap existing override ranges.
- Custom hours apply to exactly one date.
- A past date cannot be booked according to `Asia/Jerusalem`.
- Active appointment conflicts generate warnings for administrators and unavailable-slot responses for customers.
- Database or network failures return stable, sanitized reasons and are logged server-side without exposing SQL or credentials.

## Existing Booking Policy

Changing weekly hours, adding a closure, or adding custom hours never cancels, reschedules, or changes an existing appointment. The dashboard warning is informational and requires confirmation. Existing appointments continue to appear in bookings and continue to block their occupied 60-minute ranges from any new slot generation.

## Testing Strategy

Follow test-driven development with a failing test observed before each production behavior.

Domain tests cover:

- the seeded seven-day schedule and Thursday closure;
- weekly resolution and single-day custom-hours precedence;
- inclusive multi-day closures;
- 60-minute slot generation from whole-hour and half-hour windows;
- invalid, overlapping, too-short, and non-divisible windows;
- overlapping date-override rejection;
- `Asia/Jerusalem` weekday and past-date behavior;
- removal of slots overlapping active whole-hour or half-hour appointments;
- cancelled appointments not blocking slots.

Repository and service tests cover:

- row mapping and parameterized queries;
- transactional weekly replacement and override mutations;
- conflict-count queries that do not mutate appointments;
- public month and day projections without private fields;
- admin authorization failures;
- authoritative booking revalidation;
- exclusion-constraint translation under concurrent booking attempts;
- sanitized storage failures.

UI tests cover:

- loading the persisted weekly schedule;
- editing, adding, and removing windows;
- Thursday rendering as closed by default;
- creating, editing, and deleting a multi-day closure;
- creating single-day custom hours;
- conflict confirmation while preserving bookings;
- load, validation, empty, pending, success, and retry states;
- disabling closed or full calendar dates;
- refreshing slots when a date changes;
- preserving customer fields after a slot becomes unavailable.

Final verification runs focused availability and booking tests, the complete Vitest suite, ESLint, and the production build. Manual checks cover `/dashboard/availability` and `/book-call` at desktop and mobile widths.

## Migration and Rollout

Add one idempotent migration after the existing booking migrations. It creates and seeds availability tables, validates existing appointment overlaps, and adds the active-time exclusion constraint without rewriting or deleting booking data.

Application code must be deployed only after the migration is applied. If the overlap preflight reports existing conflicts, deployment pauses for supervisor review; the migration must not silently choose which booking to keep.

## Success Criteria

- The Availability page reloads the same weekly schedule and overrides from Neon on another device.
- The initial schedule opens every weekday except Thursday from 11:00 to 17:00.
- The supervisor can extend recurring hours, create multiple working windows, add single-day custom hours, and create or edit an inclusive multi-day closure.
- Existing bookings survive every availability change and trigger a visible warning when affected.
- `/book-call` displays only database-derived open dates and unbooked 60-minute slots.
- The booking server rejects closed, past, overlapping, or stale slots even when the browser submits them directly.
- Concurrent overlapping appointments cannot both be created.
- Public availability responses reveal no customer or administrative data.
- Availability failures never fall back to the old hard-coded schedule.
- Reminder controls are not represented as persisted by this change.
