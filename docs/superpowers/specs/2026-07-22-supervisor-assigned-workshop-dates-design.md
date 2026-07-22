# Supervisor-Assigned Dates for Workshop Bookings

## Goal

Let customers request the first two workshops without choosing a date. A supervisor can assign the date later from the workshop bookings dashboard. Customers booking the final workshop continue to choose a required future date.

## Workshop Rules

The behavior is determined by the existing stable workshop IDs:

- `pattern-foundation`: the customer does not see or submit a date.
- `mini-course`: the customer does not see or submit a date.
- `corset-workshop`: the customer must choose a valid date after today.

Booking status and workshop date are independent for the first two workshops. A supervisor may confirm either of those bookings while its date is still unset.

## Data Model and Migration

Add a forward-only database migration that removes the `NOT NULL` constraint from `public.workshop_bookings.workshop_date`. Existing migrations and existing rows remain unchanged.

Represent an unset workshop date as `null` throughout the validated domain model, repository mapping, server functions, and dashboard. Do not use an empty string or a sentinel date in persisted data.

## Customer Booking Flow

The booking dialog derives whether the customer selects a date from the selected workshop ID.

For `pattern-foundation` and `mini-course`, omit the date field entirely. Submission sends an unset date, and server validation accepts an unset date only for those two workshop IDs. If a client attempts to send a date for either workshop, server normalization discards it and persists `null`, ensuring the supervisor remains the source of the assigned date.

For `corset-workshop`, keep the current date field, minimum-date behavior, and validation. An absent, invalid, current, or past date is rejected.

All other booking fields and the confirmation experience remain unchanged.

## Supervisor Dashboard

The workshop bookings list displays `Not set` when a booking has no date. The edit dialog allows the supervisor to assign or change the date. It also allows other customer details on either of the first two workshops to be saved while the date remains unset. Admin update validation accepts an unset date for those workshops, while `corset-workshop` retains its required date.

Status updates remain independent from date updates. In particular, changing a booking to `confirmed` must succeed when its date is unset.

Reminder links must not interpolate a missing value. When the date is unset, the reminder message refers to the workshop without an `on <date>` phrase. Once a date is assigned, the reminder includes it as before.

## Data Flow

1. The customer selects a workshop and opens the existing booking dialog.
2. The dialog shows the date input only for `corset-workshop`.
3. Client and server domain validation apply the rule associated with the selected workshop ID.
4. The repository stores either a calendar date or SQL `NULL`.
5. The dashboard maps SQL `NULL` to domain `null`, displays the unset state, and lets the supervisor edit it.
6. Status changes use their existing path and do not inspect the date.

## Error Handling

- Reject unknown or mismatched workshop ID/name pairs as before.
- Reject missing or non-future dates for `corset-workshop`.
- Normalize customer-supplied dates to `null` for the first two workshops.
- Reject malformed non-empty dates submitted through the admin edit flow.
- Preserve the existing storage-error and not-found responses.
- Generate date-safe reminder text for both assigned and unassigned bookings.

## Testing

Add or update focused tests that prove:

- The first two workshop dialogs do not render a customer date input.
- The final workshop dialog renders the date input and requires a future date.
- Customer parsing returns `date: null` for each of the first two workshops, even if a crafted request contains a date.
- Customer parsing rejects a missing or non-future date for the final workshop.
- The repository inserts, maps, lists, and updates nullable dates correctly.
- Admin parsing accepts an unset date for either of the first two workshops and rejects malformed dates.
- The dashboard renders `Not set`, permits assigning a date, and permits confirmation without a date for either of the first two workshops.
- Reminder copy omits the date phrase while the date is unset and includes it after assignment.

Run the focused workshop-booking tests first, then the complete test suite and production build.

## Scope

This change does not add workshop availability management, a separate awaiting-date status, customer notifications, or a new dashboard section. It changes only date ownership and nullable-date behavior for the existing three workshops.
