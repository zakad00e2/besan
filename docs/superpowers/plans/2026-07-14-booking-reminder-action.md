# Booking Reminder Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the desktop bookings table's reminder column with a bell action that preserves the existing WhatsApp send-and-confirm flow.

**Architecture:** Keep `ReminderAction` as the single owner of reminder URLs, callback invocation, loading state, and accessible text. Add an `icon` presentation for the desktop action group while retaining the existing text presentation in mobile cards. Remove the dedicated desktop table column and render the icon action alongside the existing booking actions.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, lucide-react, Vitest, Testing Library.

## Global Constraints

- Modify only `src/features/dashboard/dashboard-bookings.tsx` and `src/features/dashboard/dashboard-bookings.test.tsx` for the product change.
- Preserve the current WhatsApp URL from `getReminderHref()` and the `onReminderSent(id)` callback.
- Keep the mobile booking-card reminder display unchanged.
- Render a visible disabled bell for `scheduled` and `sent` reminders, and while the send callback is pending.
- Do not stage unrelated existing changes.

---

## File Structure

- `src/features/dashboard/dashboard-bookings.tsx`: imports the bell icon, gives `ReminderAction` an explicit desktop-icon presentation, removes the table reminder column, and inserts the bell action in the existing action group.
- `src/features/dashboard/dashboard-bookings.test.tsx`: specifies the removed header, enabled bell send flow, and disabled scheduled/sent bell states.

### Task 1: Move the reminder interaction into the desktop action group

**Files:**
- Modify: `src/features/dashboard/dashboard-bookings.test.tsx`
- Modify: `src/features/dashboard/dashboard-bookings.tsx`

**Interfaces:**
- Consumes: `getReminderHref(appointment, customer)`, `onReminderSent(id)`, `reminderUpdatingId`, `ReminderStatus`, and the current `tableActionButtonClassName` action styling.
- Produces: `ReminderAction` with `presentation?: "text" | "icon"`; the default `text` presentation continues to serve mobile cards and `icon` renders the desktop bell control.

- [ ] **Step 1: Write the failing table-action tests**

  In `src/features/dashboard/dashboard-bookings.test.tsx`, replace the existing `opens WhatsApp and marks a not-scheduled reminder as sent` test with the following test and add the second test immediately after it:

  ```tsx
  it("moves the not-scheduled reminder into an enabled bell action", () => {
    const onReminderSent = vi.fn();
    const appointment = {
      ...designAppointments[0],
      reminderStatus: "not-scheduled" as const,
    };
    render(
      <DashboardBookings
        customers={demoDashboardState.customers}
        appointments={[appointment]}
        dispatch={vi.fn()}
        onReminderSent={onReminderSent}
      />,
    );

    expect(screen.queryByRole("columnheader", { name: "Reminder" })).toBeNull();
    const reminderLink = screen.getAllByRole("link", {
      name: "Send reminder to Layan Mansour",
    })[0];
    expect(reminderLink.getAttribute("title")).toBe("Send reminder");
    expect(reminderLink.getAttribute("href")).toBe(
      getReminderHref(appointment, demoDashboardState.customers[0]),
    );

    fireEvent.click(reminderLink);

    expect(onReminderSent).toHaveBeenCalledWith("appointment-1");
  });

  it("keeps scheduled and sent reminder bells visible but disabled", () => {
    render(
      <DashboardBookings
        customers={demoDashboardState.customers}
        appointments={[
          { ...designAppointments[0], id: "scheduled", reminderStatus: "scheduled" },
          { ...designAppointments[0], id: "sent", reminderStatus: "sent" },
        ]}
        dispatch={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Reminder scheduled for Layan Mansour" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reminder sent for Layan Mansour" })).toBeDisabled();
  });
  ```

- [ ] **Step 2: Run the focused tests and confirm the expected failures**

  Run:

  ```powershell
  npm test -- src/features/dashboard/dashboard-bookings.test.tsx
  ```

  Expected: the first test fails because the `Reminder` column still exists and the current reminder link has no `Send reminder` title; the second test fails because there are no disabled reminder buttons.

- [ ] **Step 3: Implement the smallest presentation split**

  In `src/features/dashboard/dashboard-bookings.tsx`:

  1. Add `Bell` to the existing `lucide-react` import list.
  2. Add `presentation = "text"` to `ReminderAction`'s props and type it as `"text" | "icon"`.
  3. Keep the existing `text` return paths exactly for the mobile caller. Before those returns, add the icon presentation branch below.

  ```tsx
  if (presentation === "icon") {
    const customerName = customer?.name ?? "customer";
    const reminderLabel = `Reminder ${reminderStatusLabels[appointment.reminderStatus]} for ${customerName}`;

    if (appointment.reminderStatus !== "not-scheduled" || updating) {
      return (
        <button
          type="button"
          disabled
          aria-label={updating ? `Sending reminder to ${customerName}` : reminderLabel}
          title={updating ? "Sending reminder" : reminderStatusLabels[appointment.reminderStatus]}
          className={cn(tableActionButtonClassName, "text-slate-400")}
        >
          <Bell className="size-3.5" aria-hidden="true" />
        </button>
      );
    }

    return (
      <a
        href={getReminderHref(appointment, customer)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Send reminder to ${customerName}`}
        title="Send reminder"
        onClick={() => void onReminderSent(appointment.id)}
        className={cn(tableActionButtonClassName, "text-emerald-600 hover:bg-emerald-50")}
      >
        <Bell className="size-3.5" aria-hidden="true" />
      </a>
    );
  }
  ```

  Then remove `<th>Reminder</th>` and its corresponding `<td><ReminderAction … /></td>` from the desktop table. Inside the desktop `tableActionGroupClassName` container, insert this before the WhatsApp action and add one existing divider after it:

  ```tsx
  <ReminderAction
    presentation="icon"
    appointment={appointment}
    customer={customersById.get(appointment.customerId)}
    updating={reminderUpdatingId === appointment.id}
    onReminderSent={onReminderSent}
  />
  <span className={tableActionDividerClassName} aria-hidden="true" />
  ```

  Do not change the separate mobile `ReminderAction` call: its default `text` presentation preserves the mobile display.

- [ ] **Step 4: Run the focused tests and confirm they pass**

  Run:

  ```powershell
  npm test -- src/features/dashboard/dashboard-bookings.test.tsx
  ```

  Expected: PASS. The tests prove that the header is gone, the enabled icon preserves its URL and callback, and scheduled/sent icons are disabled.

- [ ] **Step 5: Run regression checks**

  Run:

  ```powershell
  npm test
  npm run lint
  ```

  Expected: both commands exit with code `0` and no test failures or lint errors.

- [ ] **Step 6: Commit only the implementation files**

  Run:

  ```powershell
  git add -- src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx
  git commit -m "feat: move reminder into booking actions"
  ```

  Expected: a new commit contains only the two implementation files, preserving all unrelated workspace changes.
