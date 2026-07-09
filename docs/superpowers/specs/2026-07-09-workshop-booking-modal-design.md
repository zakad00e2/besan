# Workshop Booking Modal Design

**Date:** 2026-07-09

## Goal

Add a booking action to every workshop on the workshops page. Each action opens an in-page modal where a customer can submit a workshop-specific booking request.

## Scope

The feature covers the three workshop offerings currently shown on `/workshops`:

- Pattern foundation / First workshop
- Private mini course
- One-day corset workshop

The current release is a front-end demonstration. It validates and prepares booking data, then shows an explicit demo confirmation. It does not send, persist, or claim to deliver a booking. A future dashboard integration will replace the demo submission boundary.

## User Experience

Each workshop displays a `BOOK THIS WORKSHOP` button after its pricing or final decision-making details. This placement follows the existing editorial reading order and keeps the action visually separate from the workshop title and photography.

Selecting a button opens one reusable modal populated with the selected workshop. The modal contains:

- Workshop name, displayed as read-only context
- Full name, required
- Mobile number, required
- Email address, optional
- Workshop date, required
- Participant count, required
- Additional notes, optional

The workshop date accepts tomorrow and any later calendar date. Today and past dates are unavailable. Participant count accepts any integer greater than or equal to 1, with no upper limit.

The modal can be dismissed through its close control, the Escape key, or the standard dialog outside-click behavior. On small screens, its contents scroll within the viewport.

## Submission States

Submitting incomplete or invalid data keeps the form open, preserves entered values, and presents clear field-level feedback.

Submitting valid data passes a normalized booking payload to a single demo submission handler. The form is then replaced by a confirmation that explicitly identifies itself as a demonstration and does not imply that the request reached the atelier. The confirmation includes a control to close the modal.

Closing and reopening the modal starts a fresh booking. Opening a different workshop updates both the visible workshop name and the workshop data included in the payload.

## Architecture

The workshops route owns the currently selected workshop and renders one reusable booking dialog. Each workshop button supplies a stable workshop identifier and display name to that dialog.

Booking validation and payload normalization live in a small domain module independent of the visual component. The payload shape is:

```ts
type WorkshopBookingRequest = {
  workshopId: string;
  workshopName: string;
  fullName: string;
  mobile: string;
  email?: string;
  date: string;
  participants: number;
  notes?: string;
};
```

The modal calls one submission boundary with this payload. In this release, the boundary resolves locally and triggers the demo confirmation. Future dashboard work can replace that boundary with an API call without changing the workshop buttons, field validation, or payload shape.

The implementation will reuse the project's existing dialog, calendar, and button primitives where they match the interaction requirements and existing styling.

## Accessibility

The modal uses the existing accessible dialog primitive for focus trapping, keyboard dismissal, and screen-reader labeling. Every form control has a visible label. Validation feedback is associated with its field, and the modal title includes the selected workshop context. Controls retain visible keyboard focus states.

## Error Handling

Client-side validation rejects:

- A missing workshop selection
- Empty full name or mobile number
- An invalid optional email address
- A missing date
- Today or a past date
- A participant count that is not an integer of at least 1

Validation errors do not clear valid inputs. Because this release has no network request, it does not simulate network failures or display a false delivery status.

## Verification

Automated checks cover:

- Today and past dates are rejected.
- Tomorrow and later dates are accepted.
- Participant count must be an integer of at least 1 and has no upper limit.
- Optional email is accepted when empty and rejected when malformed.
- The normalized payload contains the selected workshop identifier and name.
- Every workshop section exposes a booking action.
- The workshops route uses the shared booking modal.

Project lint and production build must pass. Browser verification covers opening each workshop's modal, confirming that the correct workshop is shown, validating error behavior, submitting valid values, seeing the demo confirmation, keyboard dismissal, and mobile viewport scrolling.

## Out of Scope

- Dashboard development
- API submission or persistence
- Email or WhatsApp delivery
- Payment collection
- Capacity limits
- Time-slot selection
- Availability management
