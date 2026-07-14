# Booking reminder action design

## Goal

Remove the desktop bookings table's standalone `Reminder` column and expose the existing reminder action as a bell icon within the `Action` control group.

## Scope

- Update `src/features/dashboard/dashboard-bookings.tsx`.
- Update `src/features/dashboard/dashboard-bookings.test.tsx`.
- Preserve the mobile booking card layout.
- Preserve the existing WhatsApp deep link and reminder-confirmation callback.

## Desktop table behavior

The desktop table will no longer render the `Reminder` header or a reminder table cell. The `Action` group will include a bell control.

- For a `not-scheduled` reminder, the bell is an enabled link. It opens the existing WhatsApp reminder URL in a new tab and invokes `onReminderSent` for the appointment.
- For a `scheduled` or `sent` reminder, the bell remains visible but is disabled. Its accessible name communicates the applicable reminder state.
- While the reminder confirmation is in progress, the bell is disabled and exposes the existing waiting state.

The existing WhatsApp, next-appointment, edit, and delete controls retain their current ordering and behavior. The bell uses the existing compact action-group styling, with a semantic title and accessible label.

## Testing

Add UI tests that verify:

1. The desktop table does not render a `Reminder` column header.
2. A not-scheduled appointment has an enabled bell link with the existing reminder URL and clicking it invokes `onReminderSent`.
3. Scheduled and sent reminders render a visible, disabled bell action with an appropriate accessible name.

Run the focused test file, then the full test suite and lint after implementation.
