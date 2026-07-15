# Task 7 report

## Summary

- Added `useBookingAvailability`, which fetches public month open dates and date slots with retry-ready loading and error state.
- Replaced the public booking calendar's temporary `timesByDay` schedule with persisted public availability.
- Added retry, loading, empty-date, and stale-slot handling; stale slot refresh preserves customer form values.
- Replaced the legacy static-schedule route test and added focused controller/route tests.

## Verification

- RED: `npx vitest run src/features/book-call/use-booking-availability.test.tsx` failed as expected because `use-booking-availability.ts` did not exist.
- RED: `npx vitest run src/routes/-book-call.test.tsx` failed as expected because the route did not load public date slots, still rendered fixed times, and lacked retry/stale-slot handling.
- GREEN: `npx vitest run src/features/book-call/use-booking-availability.test.tsx src/routes/book-call.test.tsx src/routes/-book-call.test.tsx src/features/book-call/booking-domain.test.ts src/features/book-call/booking-service.test.ts` — 5 files passed, 28 tests passed.
- `rg -n "timesByDay|appointmentDays|getAppointmentDay" src/features/book-call src/routes/book-call.tsx` — no matches (exit code 1 is expected for no matches).
- `npm run build` — exit code 0. Existing non-blocking build warnings remain for the legacy `src/routes/book-call.test.tsx` route-file name, a Vite tsconfig-paths advisory, and chunk-size guidance.

## Commit note

`src/routes/book-call.tsx` contained pre-existing uncommitted Task 5 motion/UI changes before Task 7 began. Task 7 changes overlap that file, so a task-only commit cannot be staged without also capturing those existing edits. Awaiting parent direction before committing.

## P1 stale-response fix

- RED: Added deferred-promise tests proving that a late date response cannot replace slots for a subsequently selected date, and that a late month response cannot replace open dates for a subsequently selected month. Both tests failed before the fix with the earlier response shown in state.
- GREEN: Added independent latest-request guards for month and date availability loads in `useBookingAvailability`; stale completions no longer update data, error, or loading state.
- Verification: `npm test -- src/features/book-call/use-booking-availability.test.tsx` — 1 file passed, 6 tests passed. `npx eslint src/features/book-call/use-booking-availability.ts src/features/book-call/use-booking-availability.test.tsx` — exit code 0.
- Note: `npm run lint -- --quiet ...` still invokes the repository-wide `eslint .` script and reports pre-existing unrelated formatting errors; the focused lint command above is clean.
