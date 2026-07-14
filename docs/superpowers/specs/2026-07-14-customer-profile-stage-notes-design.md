# Customer Profile Stage Notes Design

## Goal

Show every non-empty appointment note in the Customer Profile **Notes** section, with the appointment's stage and date so staff can understand the note's context.

## Current Behavior

Booking records already contain `notes` and are normalized into dashboard appointments. Customer profiles render only `customer.notes`, which is initialized as an empty array for persisted booking data. As a result, stage notes do not appear in the profile.

## Design

The customer-profile component will derive its Notes feed from the supplied appointments for that customer.

- Exclude appointments without a non-empty note.
- Sort the remaining appointments by `startsAt`, newest first.
- Render one note card per appointment.
- Each card shows the appointment stage/purpose, note text, and appointment date.
- Preserve the existing empty-state message when there are no stage notes.

This keeps appointments as the single source of truth and avoids copying note data into a parallel customer-note store.

## Data Flow

`booking records -> normalized appointments -> Customer Profile -> Notes feed`

No database schema, API contract, or booking-write behavior changes are required.

## Error Handling

Empty or whitespace-only note values are ignored. Missing notes continue to produce the existing empty state.

## Testing

Add a component regression test that supplies appointments with notes at different stages and dates, then verifies that the Notes section displays each note with its stage label in newest-first order. Retain coverage for the empty state.

## Scope

The change affects only the Customer Profile Notes section. It does not alter appointment notes in the bookings list or introduce editable customer notes.
