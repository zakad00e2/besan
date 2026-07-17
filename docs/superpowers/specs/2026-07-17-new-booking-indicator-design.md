# New Booking Indicator Design

## Goal

Allow each supervisor to identify design bookings that were created after the supervisor last successfully viewed the bookings page.

## Scope

This change adds a persistent, per-supervisor visit checkpoint for `/dashboard/bookings` and a visible `New booking` indicator for design bookings created after that checkpoint.

It does not add push notifications, email or WhatsApp notifications, a manual read/unread control for individual bookings, or indicators for workshop bookings.

## Data Model

Add a database table for booking-page view checkpoints. Each row is keyed by the authenticated administrator identity and stores `last_seen_at` as a timezone-aware timestamp. The checkpoint records the most recent successful page-view snapshot, rather than a browser-local value.

The existing `appointments.created_at` value remains the authoritative creation time for a booking. It is already returned by the booking repository and will be carried through the dashboard appointment view model.

## Data Flow

When an authenticated supervisor opens `/dashboard/bookings`, the server reads that supervisor's previous checkpoint and obtains a stable server-side snapshot timestamp with the persisted booking list. A booking is new when its `created_at` is later than the previous checkpoint.

Only after the booking list has loaded successfully does the client record the supplied snapshot timestamp as the supervisor's new checkpoint. A loading, authorization, or storage failure must not advance the checkpoint.

Using a snapshot timestamp prevents a booking that arrives while the list is loading from being silently consumed: it remains newer than the stored checkpoint and appears as new on the next successful visit.

## Interface

The bookings table will show a compact, accessible `New booking` badge beside each qualifying booking. It will use the existing dashboard visual language and will not change sorting, filters, editing, status changes, reminders, or deletion behavior.

On a supervisor's first successful visit, no existing booking is marked new. The saved checkpoint establishes the baseline for later visits.

## Authorization and Errors

Both the read/checkpoint projection and checkpoint update require the existing authenticated administrator authorization. The browser never receives database credentials or raw database errors.

If the checkpoint cannot be read or saved, the page preserves its current safe loading/error behavior. A checkpoint failure does not block the supervisor from viewing bookings, but it does not claim a durable read state that was not saved.

## Testing

Use focused tests to cover:

- first successful visit establishing a baseline without marking historical bookings as new;
- subsequent visits marking only bookings created after the saved checkpoint;
- independent checkpoints for different supervisors;
- a failed list load or failed checkpoint update not incorrectly advancing the checkpoint;
- dashboard data mapping preserving booking creation time;
- accessible rendering of the `New booking` badge and its absence for older bookings.

Final verification will run the focused tests, the full Vitest suite, ESLint, the production build, and a diff review.

## Success Criteria

- Each supervisor sees only the design bookings created after that supervisor's last successful booking-page visit as new.
- The result is durable across browser sessions and devices.
- Existing booking workflows continue to function unchanged.
- Historical bookings are not marked new on the first successful visit.
- Failed loads never silently mark bookings as seen.
