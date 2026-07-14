# Booking Period Filter Design

## Goal

Add a period filter to the design-appointment bookings table so an administrator can view all, upcoming, or past appointments.

## Scope

- Update `src/features/dashboard/dashboard-bookings.tsx`.
- Update `src/features/dashboard/dashboard-bookings.test.tsx`.
- Keep the existing search, status, and explicit-date filters working together with the new filter.
- Apply the result to both the desktop table and the mobile booking cards.

## Interface

Add a `Period` select to the existing booking-filter bar with these values:

- `All` (the default)
- `Upcoming`
- `Past`

The select uses the same visual treatment as the existing `Status` filter. No route, URL, or persistence state changes are needed.

## Filtering Behaviour

Extend `BookingFilters` with a `period` value of `all`, `upcoming`, or `past`.

Appointment dates are stored as local atelier calendar-date prefixes in `startsAt`. Compare `appointment.startsAt.slice(0, 10)` with the current local calendar date in `YYYY-MM-DD` format:

- `upcoming` includes appointments dated today or later.
- `past` includes appointments dated before today.
- `all` does not constrain the date range.

The period constraint is combined with the existing query, status, and explicit-date constraints using logical AND. Existing ascending chronological sorting remains unchanged.

## Testing

Add helper tests with a fixed current date that prove each period returns the expected appointments, including that an appointment on the current date is upcoming. Add a rendered-component test that changes the `Period` select and verifies only the matching booking is displayed.

## Error Handling

No new asynchronous work or error states are introduced. If a filter combination has no matches, the existing empty state remains the response.
