# Dashboard Legacy Pending Status Design

**Status:** Approved for planning

## Goal

Update the dashboard so the retired `pending` appointment status is treated as `confirmed` wherever dashboard booking status data is calculated or displayed.

## Scope

- Apply only to dashboard presentation and aggregation for design appointments.
- Preserve historical `pending` values in persisted data.
- Do not change workshop-booking status behavior or perform a data migration.

## Design

The dashboard model will expose one normalization helper that maps a legacy `pending` status to `confirmed`. Dashboard consumers use the normalized status rather than the stored value.

`Booking status distribution` will contain only three buckets: `Confirmed`, `Completed`, and `Cancelled`. Legacy pending appointments contribute to the confirmed count and to the total.

`Today's appointments` (and the week view that shares its schedule table) will render a legacy pending appointment with the confirmed status badge and label. Appointment inclusion and ordering remain unchanged.

## Verification

- Model tests prove that confirmed and legacy pending appointments are aggregated together.
- Chart tests prove that only the three active labels render and their total includes legacy pending records.
- Overview tests prove a legacy pending appointment appears as confirmed in the schedule table.
