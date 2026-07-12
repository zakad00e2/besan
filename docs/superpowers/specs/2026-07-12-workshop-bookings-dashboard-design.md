# Workshop Bookings Dashboard Design

**Date:** 2026-07-12

## Goal

Persist customer workshop requests in Neon and expose them in a dedicated dashboard page. Workshop bookings must no longer appear in the general Bookings page, which remains focused on atelier appointments.

## Scope

This feature covers the existing workshop booking form and a new admin dashboard page at `/dashboard/workshop-bookings`.

The customer submission captures and persists:

- Stable workshop identifier and workshop name
- Full name
- Mobile number
- Optional email address
- Requested workshop date
- Participant count
- Optional notes
- Submission timestamp
- Booking status

New workshop bookings start with `pending`. An authenticated administrator can change the status to `confirmed`, `completed`, or `cancelled` from the dashboard table.

Payment collection, capacity limits, time-slot management, automated notifications, and customer self-service are outside this release.

## Data Model

Add a new forward-only migration that creates `public.workshop_bookings`. Do not edit the existing published migration.

The table contains:

- `id`: UUID primary key
- `workshop_id`: stable text identifier
- `workshop_name`: workshop display name captured at submission time
- `full_name`: required customer name
- `mobile`: required customer mobile number
- `email`: nullable email address
- `workshop_date`: required date
- `participants`: positive integer
- `notes`: required text with an empty-string default
- `status`: `pending`, `confirmed`, `completed`, or `cancelled`
- `created_at` and `updated_at`: timestamps

Indexes support descending submission-date queries plus status and workshop filtering. Workshop requests remain separate from `customers` and `appointments` because they have a different lifecycle and fields. A workshop request does not reserve an appointment slot.

## Customer Submission Flow

The existing workshop dialog keeps its current fields and client-side validation. On valid submission it calls a public server function. The server repeats all validation before writing to Neon; client validation is only an early usability check.

The workshop repository inserts the normalized request and returns the new booking identifier. The dialog displays a real success confirmation only after the database write succeeds. While the request is in flight, the submit control is disabled and communicates progress. If persistence fails, the form remains open, preserves the customer's values, and displays an inline retryable error without claiming success.

The server accepts only the stable workshop identifiers and names defined by the application. This prevents callers from inventing arbitrary workshop records while preserving the name that was presented when the request was made.

## Dashboard Page

Add `Workshop bookings` to the existing dashboard navigation and page metadata. The page uses the dashboard's established English, left-to-right visual language.

The desktop table displays:

1. Customer name
2. Mobile number
3. Email
4. Workshop
5. Requested date
6. Participants
7. Notes
8. Submitted at
9. Status

On small screens, each booking becomes a compact stacked row so important fields remain readable without forcing horizontal page scrolling.

The page supports:

- Search across customer name, mobile number, and email
- Filtering by workshop
- Filtering by status
- An inline status selector for the four allowed states
- Loading, empty, error, and update-in-progress states

Changing a status calls an authenticated server function. The control is disabled during the update. The UI replaces the row with the server-confirmed result and shows a concise success message. On failure, it retains the previous status and shows an error message.

## Separation from General Bookings

The general `/dashboard/bookings` page continues loading only records from `public.appointments`. Remove `Workshop` from its type filter and create/edit form so an administrator cannot add a workshop record through the appointment workflow.

No existing appointment rows are migrated or deleted. The separation is defined by storage and query boundaries: appointments come from `appointments`, while workshop requests come from `workshop_bookings`.

## Authorization and Security

Customer workshop submission is public and does not require authentication.

Listing workshop bookings and changing their status require the existing dashboard administrator token verification. Server functions do not trust client-provided status values or workshop definitions; they validate both against explicit allowlists.

Database errors are logged on the server. Public responses use concise generic messages and do not expose connection details or SQL errors.

## Architecture

Keep the feature in a dedicated `workshop-booking` boundary:

- Domain validation and shared types normalize submissions and status changes.
- A server-only repository owns SQL for create, list, and status update operations.
- Public and admin server functions expose those operations at the correct authorization boundary.
- The existing dialog owns customer form state and submission feedback.
- A focused dashboard component owns filtering, responsive presentation, and status controls.
- A dashboard route loads authenticated data and handles authentication or load failures.

This separation keeps SQL out of React components and makes domain and repository behavior independently testable.

## Error Handling

Reject submissions with an unknown workshop, missing name or mobile, malformed optional email, a date earlier than tomorrow, a non-integer participant count below one, or notes beyond the configured database limit.

The customer form preserves valid input after validation or network failures. The dashboard distinguishes signed-out, forbidden, loading, empty, and load-error states. Status update failures never optimistically leave a row showing an unconfirmed value.

## Verification

Automated tests cover:

- Workshop request normalization and validation
- Repository insert mapping and list mapping
- Public submission success and persistence failure behavior
- Administrator authorization for listing and status updates
- Status allowlist enforcement
- Dashboard searching and filtering
- Status update success and rollback behavior
- Responsive empty and populated presentations
- Absence of the Workshop option from the general Bookings page

Run the focused tests, the full test suite, lint, production build, and route-generation checks. Browser verification covers a real customer submission, its appearance on the new dashboard page, status changes, filters, failure messaging, and mobile layout.

## Rollout Notes

Apply the new migration to the configured Neon database before relying on live submission. The code and migration should remain backward-safe: existing appointment booking continues to work, and no published git history is rewritten.
