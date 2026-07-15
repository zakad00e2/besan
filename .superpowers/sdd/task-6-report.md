# Task 6 report: persisted routes and read-only profile

## Implemented

- Added `usePersistedBookingData(enabled)` to load and normalize authenticated booking data.
- Updated the bookings route to use the shared loader, preserve its status/delete/reminder mutations, remove a customer only after their final appointment is deleted, and immediately merge successful next-appointment scheduling results.
- Updated both customer routes to load persisted data rather than `useDashboard()` state.
- Made the customer stage and notes/activity read-only, and classify completed/cancelled appointments as previous regardless of their timestamp.
- Replaced the mutable profile test with the requested persisted-stage/current-vs-previous test.

## TDD evidence

The new profile test was run before the implementation and failed because the existing `Customer stage` control was a `<select>`, whose text included every stage option. After implementation it passed.

## Verification

- `npx vitest run src/features/dashboard/dashboard-customer-profile.test.tsx` — passed (1 test).
- `npx vitest run src/features/dashboard/dashboard-booking-data.test.ts src/features/dashboard/dashboard-next-appointment-dialog.test.tsx src/features/dashboard/dashboard-bookings.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx` — passed (4 files, 14 tests).
- `npm run build` — passed.

## Commit status

No commit was created. The working tree already contained unstaged changes, including Task 3/5 work in `src/routes/dashboard/bookings.tsx`; staging the six Task 6 files as a normal commit would capture unrelated existing hunks. All Task 6 changes remain unstaged.

## Task 6: persisted availability editor

### Implemented

- Added `useDashboardAvailability(enabled)` to load and mutate the authenticated availability configuration through the Task 4 admin functions.
- Replaced the demo slot grid with seven-day weekly editing, 30-minute time controls, inclusive closure ranges, custom hours, chronological exception controls, and conflict re-confirmation.
- Wired the dashboard route to the persisted controller and retained reminder settings through `useDashboard()`.

### TDD evidence

- `npx vitest run src/features/dashboard/use-dashboard-availability.test.tsx` initially failed because `use-dashboard-availability.ts` did not exist.
- `npx vitest run src/features/dashboard/dashboard-availability.test.tsx` initially failed because the existing component only accepted demo slots and did not expose the persisted editor interactions.

### Verification

- `npx vitest run src/features/dashboard/use-dashboard-availability.test.tsx src/features/dashboard/dashboard-availability.test.tsx` — passed (2 files, 8 tests).
- `npx eslint src/features/dashboard/use-dashboard-availability.ts src/features/dashboard/use-dashboard-availability.test.tsx src/features/dashboard/dashboard-availability.tsx src/features/dashboard/dashboard-availability.test.tsx src/routes/dashboard/availability.tsx` — passed.
- `npx tsc --noEmit` — failed on pre-existing unrelated type errors in `src/features/auth/admin-auth.server.ts`, `src/features/auth/admin.functions.ts`, and availability repository tests; no task-specific diagnostic was observed before the command output was truncated.

## Task 6 review follow-up: client validation and reminder settings

### Implemented

- Validated weekly schedule drafts in the dashboard with the shared `parseWeeklySchedule` validator before calling the weekly mutation, and rendered validation messages beside the relevant weekday.
- Restored the supervisor dashboard reminder switch and updated its setting by spreading the complete `ReminderSettings` object.

### TDD evidence

- Added focused UI tests first. They failed as expected: an invalid 30-minute Sunday window still called `onSaveWeekly`, and the supervisor reminder control was absent.
- After the minimal implementation, the focused availability dashboard suite passed.

### Verification

- `npm test -- src/features/dashboard/dashboard-availability.test.tsx` — passed (1 file, 6 tests).
- `npx eslint src/features/dashboard/dashboard-availability.tsx src/features/dashboard/dashboard-availability.test.tsx` — passed.
- `git diff --check -- src/features/dashboard/dashboard-availability.tsx src/features/dashboard/dashboard-availability.test.tsx` — passed.
