# Workshop Booking Actions Design

**Date:** 2026-07-15

## Goal

Add an `Actions` column to the dashboard workshop-bookings table, using the compact icon-group treatment already established in the general bookings table.

## Scope

The desktop workshop table adds an `Actions` column with four accessible icon buttons:

1. **Reminder:** Opens WhatsApp with a prefilled reminder containing the customer's name, workshop name, and workshop date.
2. **WhatsApp:** Opens a normal WhatsApp conversation with the customer's mobile number.
3. **Edit:** Opens a dialog that can update only `fullName`, `mobile`, `email`, `date`, and `participants`.
4. **Delete:** Opens a destructive confirmation dialog. Confirmation permanently deletes the booking.

The existing `Update status` select remains in its own column and continues to be the only way to change a booking's status.

The mobile booking card keeps its existing status control and gains text equivalents of the same four actions.

## Architecture and Data Flow

- `DashboardWorkshopBookings` owns edit-dialog and delete-confirmation UI state and receives edit/delete callbacks plus their loading and error state as props.
- The workshop dashboard route owns remote mutations, fetches an auth token, replaces an edited booking in local state, and removes a deleted booking from local state.
- The admin function layer adds authenticated edit and delete operations.
- The workshop repository adds parameterized `UPDATE` and `DELETE` queries. The edit query returns the normalized booking record; delete reports whether a record was found.
- The database schema requires no migration because all editable fields already exist.

## Interaction and Error Handling

- Icon buttons have descriptive `aria-label` and `title` values.
- Edit fields validate required name, mobile, date, and participant count before submitting; email remains optional.
- While a booking is saving or deleting, its related controls are disabled to prevent duplicate mutations.
- Remote failures are displayed in the page alert area without discarding the visible row or the edit form values.
- Cancelling either dialog changes no data.

## Verification

- Component tests cover the action column, generated WhatsApp links, edit form validation/submission, delete confirmation, disabled states, and error display.
- Repository and admin-function tests cover update and delete success, missing records, and authorization failures.
- Focused tests, lint, and a production build must pass.
