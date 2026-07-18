# Customer Profile Stage Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display every non-empty appointment note in the Customer Profile Notes section with its appointment stage and date.

**Architecture:** Keep appointment records as the source of truth. The customer-profile component derives a note feed from the provided appointments belonging to the viewed customer, filters blank notes, sorts descending by `startsAt`, and renders the appointment `purpose` as the stage context.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, React Testing Library.

## Global Constraints

- Do not change the database schema, booking API, or booking write behavior.
- Do not duplicate appointment notes into `Customer.notes`.
- Ignore `undefined`, empty, and whitespace-only appointment notes.
- Preserve the existing `No notes.` empty state.
- Keep the work limited to the Customer Profile Notes section.

---

## File Structure

- Modify: `src/features/dashboard/dashboard-customer-profile.tsx` — derive and render appointment-backed stage notes in the existing Notes section.
- Modify: `src/features/dashboard/dashboard-customer-profile.test.tsx` — cover note content, stage context, descending date order, blank-note filtering, and the empty state.

### Task 1: Customer Profile Stage-Note Feed

**Files:**
- Modify: `src/features/dashboard/dashboard-customer-profile.test.tsx`
- Modify: `src/features/dashboard/dashboard-customer-profile.tsx`

**Interfaces:**
- Consumes: `customer: Customer`, `appointments: Appointment[]`, and `Appointment` fields `customerId`, `purpose`, `notes?`, and `startsAt`.
- Produces: the Customer Profile Notes UI, where each visible note has a stage heading (`purpose`), body (`notes`), and ISO date (`startsAt.slice(0, 10)`).

- [ ] **Step 1: Write the failing regression test**

Add this test to `src/features/dashboard/dashboard-customer-profile.test.tsx` after the existing stage/appointment test:

```tsx
  it("shows each customer stage note newest first and ignores blank notes", () => {
    const customer = demoDashboardState.customers[0];
    const appointments = [
      {
        ...demoDashboardState.appointments[0],
        id: "stage-note-initial",
        customerId: customer.id,
        purpose: "Initial consultation",
        notes: "Bring reference photos",
        startsAt: "2026-07-10T10:00:00.000Z",
      },
      {
        ...demoDashboardState.appointments[0],
        id: "stage-note-measurements",
        customerId: customer.id,
        purpose: "Measurements",
        notes: "Wear the selected shoes",
        startsAt: "2026-07-12T10:00:00.000Z",
      },
      {
        ...demoDashboardState.appointments[0],
        id: "stage-note-blank",
        customerId: customer.id,
        purpose: "Fitting",
        notes: "   ",
        startsAt: "2026-07-13T10:00:00.000Z",
      },
    ];

    render(<DashboardCustomerProfile customer={customer} appointments={appointments} />);

    expect(screen.getByText("Bring reference photos")).toBeTruthy();
    expect(screen.getByText("Wear the selected shoes")).toBeTruthy();
    expect(screen.getByText("Initial consultation")).toBeTruthy();
    expect(screen.getByText("Measurements")).toBeTruthy();
    expect(screen.queryByText("Fitting")).toBeNull();
    expect(screen.queryByText("No notes.")).toBeNull();

    const noteBodies = screen.getAllByTestId("stage-note-body").map((element) => element.textContent);
    expect(noteBodies).toEqual(["Wear the selected shoes", "Bring reference photos"]);
  });
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing behavior**

Run:

```powershell
npm test -- src/features/dashboard/dashboard-customer-profile.test.tsx
```

Expected: the new test fails because the profile renders `customer.notes` (an empty array), so the stage-note text is absent.

- [ ] **Step 3: Implement the minimal appointment-backed note feed**

In `src/features/dashboard/dashboard-customer-profile.tsx`, replace the existing `useMemo` declaration with:

```tsx
  const { upcoming, previous, stageNotes } = useMemo(() => {
    const all = appointments
      .filter((item) => item.customerId === customer.id)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return {
      upcoming: all.filter(
        (item) =>
          !["completed", "cancelled"].includes(item.status) && new Date(item.startsAt) >= now,
      ),
      previous: all
        .filter(
          (item) =>
            ["completed", "cancelled"].includes(item.status) || new Date(item.startsAt) < now,
        )
        .reverse(),
      stageNotes: all
        .filter((item) => item.notes?.trim())
        .reverse(),
    };
  }, [appointments, customer.id, now]);
```

Then replace the content of the existing Notes section with:

```tsx
          {stageNotes.length === 0 ? (
            <p className="text-sm leading-snug text-slate-500">No notes.</p>
          ) : (
            <div className="space-y-2">
              {stageNotes.map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-xs font-medium leading-snug text-violet-700">{item.purpose}</p>
                  <p data-testid="stage-note-body" className="mt-1 text-sm leading-snug">
                    {item.notes}
                  </p>
                  <p className="mt-0.5 text-xs leading-tight text-slate-500" dir="ltr">
                    {item.startsAt.slice(0, 10)}
                  </p>
                </div>
              ))}
            </div>
          )}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```powershell
npm test -- src/features/dashboard/dashboard-customer-profile.test.tsx
```

Expected: all tests in `dashboard-customer-profile.test.tsx` pass, including the new stage-note regression test.

- [ ] **Step 5: Run final checks**

Run:

```powershell
npm test -- src/features/dashboard/dashboard-customer-profile.test.tsx
npm run lint
npm run build
```

Expected: each command exits with code 0. The focused test confirms the required UI behavior; lint and build confirm code quality and production compilation.

- [ ] **Step 6: Commit the implementation**

```powershell
git add -- src/features/dashboard/dashboard-customer-profile.tsx src/features/dashboard/dashboard-customer-profile.test.tsx
git commit -m "feat: show stage notes in customer profile"
```

Expected: Git creates a commit containing only the two Customer Profile files.
