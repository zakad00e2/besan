# Booking Confirmation Punctuality Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the punctuality and cancellation policy on the successful public booking confirmation.

**Architecture:** Keep the change local to the existing submitted-state JSX in `BookCallPage`. Add a route-level regression test that submits the Arabic form and asserts the exact customer-facing policy, then render a static bordered notice between appointment details and the map prompt.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Preserve all booking submission, date/time display, location map, and error-state behavior.
- Render the exact Arabic policy: `يرجى الالتزام بموعد الحجز. في حال التأخر أكثر من 20 دقيقة، يُعتبر الحجز ملغيًا.`
- Display the notice only after a successful booking submission, below the appointment details and before the map.

---

### Task 1: Confirmation policy notice

**Files:**
- Modify: `src/routes/-book-call.test.tsx:129-153`
- Modify: `src/routes/book-call.tsx:192-208`

**Interfaces:**
- Consumes: `BookCallPage({ locale: "ar" | "en" })` and the existing `submitBooking` mock.
- Produces: The successful confirmation state includes the Arabic punctuality policy in its notice block.

- [ ] **Step 1: Write the failing test**

Add this scenario after the existing successful English confirmation test:

```tsx
it("shows the punctuality policy in the Arabic booking confirmation", async () => {
  submitBooking.mockResolvedValue({ success: true, appointmentId: "appointment-1" });
  render(<BookCallPage locale="ar" />);

  selectJulyNineteenth();
  fireEvent.click(screen.getAllByRole("button", { name: "11:00" })[0]);
  fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "نور" } });
  fireEvent.change(screen.getByLabelText("رقم واتساب"), { target: { value: "+970591234567" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الحجز" }));
    await Promise.resolve();
  });

  expect(screen.getByText("يرجى الالتزام بموعد الحجز. في حال التأخر أكثر من 20 دقيقة، يُعتبر الحجز ملغيًا.")).toBeTruthy();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/routes/-book-call.test.tsx`

Expected: FAIL because the policy text is not rendered.

- [ ] **Step 3: Render the minimal notice**

In the submitted-state confirmation panel, directly after the appointment-details paragraph and before the map instruction, add a bordered paragraph using existing foreground and muted colors. Select exact Arabic copy when `ar` is true and an equivalent English policy otherwise:

```tsx
<p className="mt-6 border border-foreground/25 px-4 py-3 text-sm leading-7 text-foreground">
  {ar
    ? "يرجى الالتزام بموعد الحجز. في حال التأخر أكثر من 20 دقيقة، يُعتبر الحجز ملغيًا."
    : "Please arrive on time. Arrivals more than 20 minutes late are considered cancelled."}
</p>
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npm test -- src/routes/-book-call.test.tsx`

Expected: PASS, including the existing confirmation, map, and failure-state scenarios.

- [ ] **Step 5: Commit**

Stage `src/routes/book-call.tsx` and `src/routes/-book-call.test.tsx`, then commit with message `feat: add booking punctuality note`.
