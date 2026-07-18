# Next Appointment and Customer Profile Stage Design

**Date:** 2026-07-18

## Goal

Replace the administrator-only `Next appointment` choices with these four stages, in this order:

1. `Initial Consultation`
2. `First Fitting`
3. `Second Fitting`
4. `Final Fitting & Pickup`

The customer profile must display the same selected stage. Public booking choices and the general administrator booking forms remain unchanged.

## Scope

### In scope

- The purpose selector in `DashboardNextAppointmentDialog`.
- Validation and persistence of the four next-appointment values.
- The customer-stage label shown in `DashboardCustomerProfile`.
- Database compatibility for saving the new appointment-purpose strings.
- Focused domain, dialog, repository, and customer-profile tests.

### Out of scope

- Public booking appointment choices.
- Purpose choices in the general create/edit appointment forms.
- Customer-list stage labels.
- A wholesale replacement of the persisted customer lifecycle model.
- Rewriting existing appointment history.

## Design

### Separate next-appointment stages from general appointment types

The domain will define an administrator-only next-appointment stage list containing the four approved values. `DashboardNextAppointmentDialog` will render that list directly. General appointment forms will continue to use their existing appointment-type source.

The schedule-next validator will accept only the four approved values. Removed legacy values such as `New Design`, `Measurements`, `Alteration`, and `Pickup` will no longer be selectable or accepted by this workflow.

### Persist without replacing the customer lifecycle model

Each selected next-appointment stage remains the new appointment's `appointment_type`. A forward-only database migration will extend the appointment-type constraint to accept the four new strings without removing existing values needed by historical records or other forms.

Scheduling will continue to update the persisted broad customer lifecycle stage:

| Next appointment stage | Persisted lifecycle stage |
| --- | --- |
| `Initial Consultation` | `initial-appointment` |
| `First Fitting` | `fitting` |
| `Second Fitting` | `fitting` |
| `Final Fitting & Pickup` | `ready-delivery` |

This preserves compatibility with current metrics, follow-up logic, and existing customer records.

### Display the exact stage in the customer profile

`DashboardCustomerProfile` will derive the displayed stage from the customer's relevant appointments:

1. Prefer the nearest active upcoming appointment whose purpose is one of the four approved stages.
2. Otherwise use the most recent non-cancelled appointment whose purpose is one of the four approved stages.
3. If neither exists, fall back to the current persisted lifecycle label so historical customers still have a meaningful stage.

This display-only derivation preserves the distinction between `First Fitting` and `Second Fitting`, which the broad persisted `fitting` lifecycle value cannot represent.

Upcoming and previous appointment lists, notes, and appointment history continue to show their stored purposes unchanged.

## Data Flow

1. The administrator opens `Next appointment`.
2. The dialog renders the four administrator-only stages.
3. The selected stage is validated by the schedule-next schema.
4. The repository saves it as the next appointment purpose and maps it to the compatible broad customer lifecycle stage.
5. The customer profile derives and displays the exact stage from appointment history, with a lifecycle-label fallback.

## Error Handling and Compatibility

- Unknown or removed next-appointment values fail schedule-next validation.
- Existing appointment rows keep their original purpose strings and remain readable.
- Existing customer lifecycle values remain valid.
- The migration is additive and does not rewrite published history or delete existing data.
- Slot conflicts, availability errors, and submission errors retain their existing behavior.

## Testing

- Domain test: the next-appointment stage list contains exactly the four approved values in order.
- Domain test: schedule-next validation accepts each approved stage and rejects removed values.
- Domain test: each approved stage maps to the expected broad lifecycle stage.
- Dialog test: the selector exposes exactly the four approved options plus its placeholder.
- Dialog test: a selected approved stage is submitted unchanged.
- Repository test: scheduling persists a new approved appointment purpose and updates the compatible lifecycle stage.
- Customer-profile tests:
  - prefer an approved upcoming stage;
  - distinguish first and second fitting;
  - use the most recent approved historical stage when no active stage exists;
  - fall back to the persisted lifecycle label for legacy customers.

## Success Criteria

- The `Next appointment` selector shows only the four approved stages.
- Scheduling any approved stage succeeds through validation and persistence.
- The customer profile shows the same exact selected stage when relevant appointment data exists.
- Public and general administrator booking choices are unchanged.
- Existing customer and appointment records remain readable.
