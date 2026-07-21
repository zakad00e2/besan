# Booking Confirmation Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a booking-confirmation screen with a clickable embedded atelier map after a successful public appointment booking.

**Architecture:** Keep the existing `/book-call` route. When the successful `submitted` state is true, replace the form with a localized confirmation component; preserve the existing form and all failure paths otherwise. Fixed location URLs are route-level constants because this location is public static presentation data.

**Tech Stack:** React 19, TypeScript, TanStack Router, Tailwind CSS, Vitest, React Testing Library, Lucide React.

## Global Constraints

- Render confirmation only when `submitBooking` resolves with `{ success: true }`.
- Use `32.866546630859375,35.29303741455078`, `z=17`, and `hl=ar` for Google Maps.
- Show the map with no standalone location button; clicking it opens the supplied Google Maps location in a new browsing context.
- Keep Arabic and English content localized, and preserve all booking error and validation behavior.
- Do not add a database migration or mapping dependency.

---

## File Structure

- `src/routes/book-call.tsx`: booking state, confirmation rendering, and fixed map URLs.
- `src/routes/-book-call.test.tsx`: route integration tests for success and failure behavior.

### Task 1: Specify the confirmation at the route boundary

**Files:**

- Modify: `src/routes/-book-call.test.tsx`

**Interfaces:**

- Consumes: existing `BookCallPage`, mocked `submitBooking`, and mocked availability data.
- Produces: failing success and failure tests used by the component implementation.

- [ ] **Step 1: Add a valid-form helper**

```tsx
function fillBookingForm() {
  selectJulyNineteenth();
  fireEvent.click(screen.getAllByRole("button", { name: "11:00" })[0]);
  fireEvent.change(screen.getByLabelText("Full Name"), {
    target: { value: "Noor Al-Hashemi" },
  });
  fireEvent.change(screen.getByLabelText("WhatsApp Number"), {
    target: { value: "+970591234567" },
  });
}
```

- [ ] **Step 2: Add the successful-booking failing test**

```tsx
it("replaces the booking form with a clickable location confirmation after a successful booking", async () => {
  submitBooking.mockResolvedValue({ success: true, appointmentId: "appointment-1" });
  render(<BookCallPage locale="en" />);
  fillBookingForm();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));
    await Promise.resolve();
  });
  expect(screen.getByRole("status")).toHaveTextContent("Your booking is confirmed");
  expect(screen.getByText(/sunday, july 19, 2026/i)).toBeTruthy();
  expect(screen.getByText("11:00")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Confirm Booking" })).toBeNull();
  expect(screen.getByTitle("Atelier location")).toHaveAttribute(
    "src",
    expect.stringContaining("32.866546630859375%2C35.29303741455078"),
  );
  expect(screen.getByRole("link", { name: "Open atelier location in Google Maps" })).toHaveAttribute(
    "href",
    "https://www.google.com/maps?q=32.866546630859375,35.29303741455078&z=17&hl=ar",
  );
});
```

- [ ] **Step 3: Add the failed-save regression test**

```tsx
it("keeps the booking form visible when the booking is not saved", async () => {
  submitBooking.mockResolvedValue({ success: false, reason: "storage-error" });
  render(<BookCallPage locale="en" />);
  fillBookingForm();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));
    await Promise.resolve();
  });
  expect(screen.getByRole("button", { name: "Confirm Booking" })).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("alert")).toHaveTextContent("We could not save your booking");
});
```

- [ ] **Step 4: Run the focused test and observe the expected failure**

Run: `npm test -- src/routes/-book-call.test.tsx`

Expected: the new success test fails because the current route keeps the booking form and does not render a map.

### Task 2: Render the localized confirmation and map

**Files:**

- Modify: `src/routes/book-call.tsx:1-552`
- Test: `src/routes/-book-call.test.tsx`

**Interfaces:**

- Consumes: `submitted`, `locale`, `selectedDateLabel`, and `selectedTime` from `BookCallContent`.
- Produces: `BookingConfirmation({ locale, selectedDateLabel, selectedTime })`, an iframe titled `Atelier location`, and a full-map accessible link.

- [ ] **Step 1: Add fixed route constants after `dateLabelFormatter`**

```tsx
const ATELIER_MAP_URL =
  "https://www.google.com/maps?q=32.866546630859375,35.29303741455078&z=17&hl=ar";
const ATELIER_MAP_EMBED_URL =
  "https://www.google.com/maps?q=32.866546630859375%2C35.29303741455078&z=17&hl=ar&output=embed";
```

- [ ] **Step 2: Add the route-local confirmation component before `BookCallContent`**

```tsx
function BookingConfirmation({ locale, selectedDateLabel, selectedTime }: {
  locale: SiteLocale;
  selectedDateLabel: string;
  selectedTime: string;
}) {
  const ar = locale === "ar";
  return (
    <section className="mx-auto max-w-[960px] border-b border-foreground/70 px-6 py-16 md:px-10 md:py-24">
      <div className="border border-foreground/40 p-6 sm:p-10">
        <span className="t-success-check inline-flex border border-foreground p-3" data-state="in" aria-hidden="true"><Check className="h-5 w-5" /></span>
        <p role="status" className="mt-7 font-serif text-4xl tracking-tighter md:text-5xl">{ar ? "تم تأكيد حجزك" : "Your booking is confirmed"}</p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{ar ? "موعدك: " : "Your appointment: "}<span dir="ltr" className="text-foreground">{selectedDateLabel} · {selectedTime}</span></p>
        <p className="mt-10 text-xs tracking-[0.12em] text-muted-foreground">{ar ? "اضغطي على الخريطة لفتح الموقع" : "Tap the map to open the location"}</p>
        <div className="relative mt-4 aspect-[4/3] overflow-hidden border border-foreground/40 sm:aspect-[16/9]">
          <iframe title="Atelier location" src={ATELIER_MAP_EMBED_URL} className="h-full w-full border-0" loading="lazy" />
          <a href={ATELIER_MAP_URL} target="_blank" rel="noreferrer" aria-label={ar ? "فتح موقع المشغل في خرائط جوجل" : "Open atelier location in Google Maps"} className="absolute inset-0 z-10"><span className="sr-only">{ar ? "فتح الموقع" : "Open location"}</span></a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Switch `<main>` to show confirmation after success**

Change the `<main>` element at `src/routes/book-call.tsx:176` so its first child is the exact conditional `submitted ? <BookingConfirmation locale={locale} selectedDateLabel={selectedDateLabel} selectedTime={selectedTime} /> : ...`. Use the entire existing booking `<section className="mx-auto grid max-w-[1400px] ...">` from lines 177-549 as the false branch without changing any of its controls, validation, availability, or error markup.

Remove the inline submitted status message and submit-button `submitted` condition. Retain existing `setSubmitted(false)` calls before form edits and submissions.

- [ ] **Step 4: Run focused tests and verify green**

Run: `npm test -- src/routes/-book-call.test.tsx`

Expected: all focused route tests pass, including the new success and failed-save cases.

- [ ] **Step 5: Format, inspect, and commit**

Run: `npx prettier --write src/routes/book-call.tsx src/routes/-book-call.test.tsx && git diff --check`

Expected: formatting completes and `git diff --check` exits 0.

Commit the tested files with message `feat: show location after booking confirmation`.

### Task 3: Verify the complete application contract

**Files:**

- Verify: `src/routes/book-call.tsx`
- Verify: `src/routes/-book-call.test.tsx`

**Interfaces:**

- Consumes: the completed confirmation state and existing application suite.
- Produces: current test, lint, build, and requirement-check evidence.

- [ ] **Step 1: Run the complete suite**

Run: `npm test`

Expected: exit code 0 with zero failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0 with no lint errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit code 0 without TypeScript or Vite bundling errors.

- [ ] **Step 4: Check each rendered requirement**

Confirm that success replaces the form, date/time are shown, the map is visible with no button, clicking it targets the supplied Google Maps URL, content is localized, and failed submissions retain the form.
