# Task 7 P1 final fixer report

## Implemented and committed

- `src/features/book-call/use-booking-availability.ts`
  - Added a shared latest availability-operation sequence. Month and date requests retain separate loading ownership, while every response that can mutate availability data or the shared `error` must be the newest operation.
- `src/features/book-call/use-booking-availability.test.tsx`
  - Regression: a failed month request that completes after a successful newer date request cannot overwrite the shared error.
- `src/routes/-book-call.test.tsx`
  - Interaction regression: while `submitBooking` is pending, selecting a second open date does not invoke another date load and the selected date remains unchanged.

## Intentionally uncommitted route hunk

`src/routes/book-call.tsx` contains unrelated user motion edits and was not committed. The required Task 7 hunk is:

```tsx
onSelect={(date) => {
  if (submitting) return;
  setSelectedDate(date);
  setSelectedTime("");
  setSubmitted(false);
  if (date) void availability.loadDate(formatBookingDate(date));
}}
onMonthChange={(month) => {
  if (submitting) return;
  setSelectedDate(undefined);
  setSelectedTime("");
  void availability.loadMonth(month);
}}
disabled={(date) =>
  submitting || !availability.openDates.includes(formatBookingDate(date))
}
```

This prevents both day selection and month-change state mutations while a booking submit is in flight; the disabled matcher also makes dates non-interactive during that interval.

## Verification

- RED: `npm test -- src/features/book-call/use-booking-availability.test.tsx src/routes/-book-call.test.tsx` failed with both intended regressions before implementation.
- GREEN: the same command passed: 2 files, 11 tests.
- `npx eslint src/features/book-call/use-booking-availability.ts src/features/book-call/use-booking-availability.test.tsx src/routes/-book-call.test.tsx src/routes/book-call.tsx` exited 0 with one existing warning in `src/routes/book-call.tsx:49` (`react-hooks/exhaustive-deps`).
- `git diff --check` passed.

## Final P1: freeze calendar navigation during pending submit

`disabled` only blocks day buttons in `react-day-picker`; its built-in month navigation still updates the component's uncontrolled month before `onMonthChange` returns. The calendar is now controlled by route state, so a pending-submit navigation click cannot change the visible month or request another availability month.

### Intentionally uncommitted route hunk

`src/routes/book-call.tsx` has unrelated user motion edits and remains uncommitted. The exact Task 7 navigation hunk is:

```diff
 const [selectedDate, setSelectedDate] = useState<Date | undefined>();
 const [selectedTime, setSelectedTime] = useState("");
+const [displayedMonth, setDisplayedMonth] = useState(() => new Date());
 const [submitted, setSubmitted] = useState(false);
@@
 <Calendar
   mode="single"
+  month={displayedMonth}
   selected={selectedDate}
@@
 onMonthChange={(month) => {
   if (submitting) return;
+  setDisplayedMonth(month);
   setSelectedDate(undefined);
```

### Regression coverage and verification

- Added `src/routes/-book-call.test.tsx`: while `submitBooking` remains pending, clicking **Go to the Next Month** keeps the July 19 day in the rendered calendar and leaves `availability.loadMonth` at its initial single call.
- RED observed: `npm test -- src/routes/-book-call.test.tsx` failed before the route hunk because `Sunday, July 19th, 2026` disappeared after navigation, demonstrating the uncontrolled month change.
- GREEN observed: `npm test -- src/routes/-book-call.test.tsx src/routes/book-call.test.tsx` passed after the route hunk (2 files, 6 tests).
- `npx eslint src/routes/book-call.tsx src/routes/-book-call.test.tsx` completed with 0 errors and the pre-existing `react-hooks/exhaustive-deps` warning at `src/routes/book-call.tsx:50`.
- `git diff --check` completed successfully.
