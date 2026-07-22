# Confirmed Default for Design Bookings

**Status:** Awaiting user review

## Goal

Ensure newly created design bookings are confirmed by default and remove the `pending` booking status from future design-booking input and administration.

## Scope

- Applies only to design bookings in `public.appointments` and their dashboard/admin flows.
- Does not change workshop bookings or `public.workshop_bookings`.
- Does not modify existing appointments whose stored status is `pending`.

## Behavior

- A public design-booking submission creates an appointment with `confirmed` status.
- The default in the database schema is `confirmed`.
- The allowed design-booking status set is `confirmed`, `completed`, and `cancelled`.
- Dashboard status filters, status editors, labels, badges, and any related aggregation no longer offer `pending`.
- Server-side validation rejects `pending` for new or updated design bookings.

## Data and Compatibility

- A forward migration changes the `appointments.status` default and check constraint.
- Existing `pending` records remain readable so historic data is preserved; the dashboard continues to render them safely without offering them as a new selection.
- Workshop booking status behavior is unchanged.

## Verification

- Add regression tests that confirm a public booking insert relies on the `confirmed` default.
- Add tests that accept the remaining status values and reject `pending`.
- Add dashboard tests verifying `pending` is absent from selectable/filter options while legacy pending rows remain renderable.
- Run targeted tests, the full test suite, linting, and a production build.
