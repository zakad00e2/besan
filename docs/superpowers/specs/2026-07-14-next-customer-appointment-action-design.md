# Next Customer Appointment Action Design

**Date:** 2026-07-14
**Status:** Approved design

## Goal

Let an administrator schedule the next appointment for an existing customer directly from a booking row. Scheduling the next appointment must complete the current appointment, update the customer's stage from the selected next appointment type, and persist all changes so the bookings table and customer profile show the same data after a refresh.

## Current State

- The bookings route reads real appointments from Neon.
- The customer list and customer profile still read demo dashboard state.
- The existing new-appointment dialog dispatches only to local dashboard state and does not persist a new appointment.
- Booking list rows currently use an appointment ID as the customer ID, so multiple appointments for one real customer cannot be represented correctly.
- The database stores customers and appointments, but customers do not yet store a production stage.

## User Experience

### Entry Point

Add a plus action to each non-cancelled design booking:

- Desktop: place the plus button in the existing Actions group beside WhatsApp, edit, and delete.
- Mobile: add a labelled next-appointment button to each booking card.
- Hide the action for cancelled appointments.
- Allow the action for completed appointments so an administrator can schedule another appointment without changing the completed status again.

### Next-Appointment Dialog

Clicking the plus action opens the existing appointment dialog in a dedicated "next appointment" mode:

- The customer is preselected and cannot be changed.
- A compact summary identifies the current appointment that will be completed.
- The administrator selects the next appointment type, date, time, notes, and reminder setting.
- The supported types are `New Design`, `Measurements`, `First Fitting`, `Second Fitting`, `Alteration`, and `Pickup`.
- The new appointment defaults to `confirmed` and the reminder defaults to `scheduled`.
- The submit action is labelled `Complete & schedule next`.
- Disable submission while the request is in progress to prevent duplicate requests.

On success, close the dialog, show a success toast, mark the current row as completed, add the returned next appointment to the table, and update the customer's stage in all customer views.

## Customer Stage Model

Persist the customer stage in `public.customers`. Add a distinct scheduled-measurement stage so a future measurements appointment is not described as already completed.

The next appointment determines the customer's current stage:

| Next appointment type | Customer stage | Display label |
| --- | --- | --- |
| `New Design` | `initial-appointment` | Initial appointment |
| `Measurements` | `measurements-appointment` | Measurements appointment |
| `First Fitting` | `fitting` | Fitting |
| `Second Fitting` | `fitting` | Fitting |
| `Alteration` | `fitting` | Fitting |
| `Pickup` | `ready-delivery` | Ready for delivery |

The profile displays the persisted stage as a read-only status. The manual stage selector is removed. Historical completed work remains visible through the customer's completed appointments; this feature does not add a separate stage-history table.

## Architecture

### Database Migration

Add a migration that:

1. Adds `Measurements` to the `appointments.appointment_type` constraint.
2. Adds a non-null `stage` column to `customers` with a default of `new-inquiry` and a constraint covering all application stages, including `measurements-appointment`.

Keep the existing unique active-slot index. A cancelled appointment does not block a slot; every other status does.

### Domain Boundary

Add a pure mapping from appointment type to customer stage. Validate the next-appointment input at the server boundary. Validation covers:

- a UUID current appointment ID;
- one supported appointment type;
- an ISO date and `HH:MM` time;
- notes of at most 1,000 characters;
- one supported reminder status.

The administrator chooses from the supported appointment types. The server mapping, not client-provided stage data, decides the new customer stage.

### Atomic Repository Operation

Add a repository operation such as `scheduleNextAppointment`. It runs one SQL transaction with these semantics:

1. Lock and load the current appointment and its customer.
2. Return `not-found` if the appointment does not exist.
3. Return `cancelled` if the current appointment is cancelled.
4. Insert the next appointment for the same `customer_id`.
5. Set the current appointment status to `completed` if it is not already completed.
6. Update the customer's stage and `updated_at`.
7. Commit and return the updated current appointment, the new appointment, and the updated customer.

If the active-slot constraint rejects the new appointment, return `slot-unavailable`. Any failure rolls back the full operation, leaving the current appointment and customer unchanged.

Use a real transaction-capable Neon executor for this operation. Do not implement the three writes as independent HTTP database calls.

### Admin Server Function

Expose an authenticated POST server function. It:

1. Verifies the administrator token.
2. Parses and validates input.
3. Calls the atomic repository operation.
4. Maps repository outcomes to stable UI results: `forbidden`, `validation`, `not-found`, `cancelled`, `slot-unavailable`, or `storage-error`.

### Shared Dashboard Data

Return normalized persisted dashboard data:

- each customer appears once and uses the database customer UUID;
- every appointment uses its actual appointment UUID and customer UUID;
- appointment rows include status, reminder status, dates, notes, and type;
- customer rows include the persisted stage.

The bookings route, customer list, and customer profile must use this persisted data rather than demo customers or locally generated appointment IDs. A newly created appointment must therefore appear in both the bookings table and the matching customer profile after an in-memory update and after a full page refresh.

Persisting customer notes and activity history is outside this feature. Until those fields receive their own persistence design, database-backed customer profiles may render empty note and activity collections without presenting demo data as real customer data.

## UI State and Data Flow

The booking component receives an asynchronous `onScheduleNext` callback. The component owns dialog form state and exposes the current appointment ID plus next-appointment values to the route.

The route obtains the admin token and calls the server function. On success it updates its normalized customer and appointment state from the returned payload. On error it leaves the dialog open and presents a specific error next to the form. A subsequent refresh reloads the same result from Neon.

The current generic "New appointment" flow must not claim persistence until it uses a server-backed create operation. This feature changes only the row-level next-appointment action; unrelated appointment-creation behavior is not expanded implicitly.

## Error Handling

- **Authentication expired:** keep the dialog open and ask the administrator to sign in again.
- **Validation error:** associate field errors with the relevant inputs.
- **Slot unavailable:** show an overlap message and keep entered values.
- **Current appointment missing:** explain that it no longer exists and refresh the list.
- **Current appointment cancelled:** prevent the transition and refresh the row.
- **Unexpected storage error:** show a retryable general error.
- **Double submission:** disable the submit button while pending; the transaction remains the final consistency boundary.

No automatic WhatsApp message is sent. The selected reminder state is stored on the next appointment and existing reminder controls remain responsible for sending or marking reminders.

## Testing Strategy

Implementation follows test-driven development.

### Domain Tests

- Map every supported appointment type to its customer stage.
- Accept `Measurements` and reject unknown appointment types.
- Validate date, time, notes, and reminder state.

### Repository Tests

- Use the current appointment's real customer ID for the inserted appointment.
- Complete a non-completed current appointment.
- Leave an already completed current appointment completed.
- Update the customer's stage from the server mapping.
- Return the current appointment, next appointment, and customer.
- Map the active-slot unique constraint to `slot-unavailable`.
- Return `not-found` and `cancelled` without partial updates.
- Verify rollback behavior when any write fails.

### Admin Function Tests

- Reject unauthenticated and unauthorized requests.
- Reject invalid input before repository access.
- Propagate expected repository outcomes.
- Convert unexpected errors into `storage-error`.

### Component and Route Tests

- Render the plus action for eligible desktop and mobile bookings.
- Do not render it for cancelled bookings.
- Open next-appointment mode with the customer fixed and current appointment summarized.
- Submit the selected values once and show pending state.
- Keep the dialog open with field or slot errors.
- On success, show the new appointment and completed current appointment.
- Display the mapped read-only stage and the new appointment in the customer profile.
- Normalize multiple appointments under one persisted customer instead of duplicating customer profiles.

## Acceptance Criteria

1. An administrator can click `+` on an eligible booking and schedule a next appointment for the same customer.
2. The administrator chooses the next appointment type; the system does not enforce a fixed workflow sequence.
3. A successful operation creates the next appointment, completes the current appointment, and updates the customer stage atomically.
4. The next appointment is visible in the bookings table and the customer's profile immediately and after refresh.
5. The customer profile stage is read-only and reflects the selected next appointment type.
6. Cancelled current appointments cannot schedule a next appointment through this action.
7. Conflicting slots and other failures do not partially update the current appointment or customer.
8. Existing WhatsApp, edit, delete, status, and reminder actions continue to work.

## Out of Scope

- Automatic WhatsApp delivery.
- A general workflow engine or mandatory appointment sequence.
- Persistent customer notes or activity history.
- Stage-history auditing beyond completed appointment history.
- Redesigning unrelated dashboard screens.
