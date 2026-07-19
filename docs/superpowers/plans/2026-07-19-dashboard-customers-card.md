# Dashboard Customers Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overview's detailed follow-up list with a five-customer preview and a link to the full customer directory.

**Architecture:** Keep the existing `DashboardOverview` data interface and follow-up metric calculation intact. Derive a local `customerPreview` from the first five supplied customers and render it in the existing third overview card. The card uses existing customer properties and dashboard routes, so no data-layer or router changes are required.

**Tech Stack:** React 19, TypeScript, TanStack Router, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- The overview preview shows the first five supplied customers, regardless of stage or last update time.
- Each preview row includes name, current stage label, and the existing `/dashboard/customers/:id` profile link.
- The footer link targets the existing `/dashboard/customers` directory route.
- The `Needs follow-up` metric card and its calculation remain unchanged.
- Empty customer data uses `DashboardEmptyState` with customer-specific copy.

---

### Task 1: Cover the customer-preview behavior

**Files:**
- Modify: `src/features/dashboard/dashboard-overview.test.tsx:42-70`

**Interfaces:**
- Consumes: `DashboardOverview` with `customers: Customer[]`, `appointments: Appointment[]`, and `now?: Date`.
- Produces: Regression coverage for the `Customers` preview heading, all-customer data source, profile routes, five-row limit, and directory route.

- [ ] **Step 1: Write the failing test**

Replace the existing `shows metrics, reminder queue, and follow-up customers` test with this test. The fixture's fifth customer (`Tala Darwish`) is in `ready-delivery`, so it proves the preview does not use follow-up eligibility; the sixth (`Reem Shehadeh`) proves the five-row limit.

```tsx
  it("shows a five-customer preview and preserves the follow-up metric", () => {
    render(
      <DashboardOverview
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
        now={new Date("2026-07-10T08:00:00.000Z")}
      />,
    );

    expect(screen.getAllByText("Today's appointments").length).toBeGreaterThan(0);
    expect(screen.getByText("Tomorrow's reminders")).toBeTruthy();
    expect(screen.getByText("Needs follow-up")).toBeTruthy();
    expect(screen.getByText("Total bookings")).toBeTruthy();
    expect(screen.getAllByText(/Compared with last month/).length).toBeGreaterThan(0);

    const customersCard = screen.getByRole("heading", { name: "Customers" }).closest("article");
    expect(customersCard).toBeTruthy();
    expect(within(customersCard!).getByText("Layan Mansour")).toBeTruthy();
    expect(within(customersCard!).getByText("Tala Darwish")).toBeTruthy();
    expect(within(customersCard!).queryByText("Reem Shehadeh")).toBeNull();
    expect(within(customersCard!).getAllByRole("link", { name: "View profile" })[0]).toHaveAttribute(
      "href",
      "/dashboard/customers/customer-1",
    );
    expect(within(customersCard!).getByRole("link", { name: "View all customers" })).toHaveAttribute(
      "href",
      "/dashboard/customers",
    );

    const chart = screen
      .getByRole("heading", { name: "Booking status distribution" })
      .closest("article");
    expect(chart).toBeTruthy();
    expect(within(chart!).getByText(String(dashboardFixture.appointments.length))).toBeTruthy();
    expect(within(chart!).getByText("Confirmed")).toBeTruthy();
    expect(within(chart!).getByText("Pending")).toBeTruthy();
    expect(within(chart!).getByText("Completed")).toBeTruthy();
    expect(within(chart!).getByText("Cancelled")).toBeTruthy();
  });
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: FAIL because no heading named `Customers` exists while the overview still renders `Needs follow-up` as the detailed-card title.

- [ ] **Step 3: Write the empty-state test**

Add this test below the preview test. It specifies the empty copy before implementation.

```tsx
  it("shows a customer-specific empty state when no customers exist", () => {
    render(
      <DashboardOverview
        customers={[]}
        appointments={[]}
        now={new Date("2026-07-10T08:00:00.000Z")}
      />,
    );

    const customersCard = screen.getByRole("heading", { name: "Customers" }).closest("article");
    expect(customersCard).toBeTruthy();
    expect(within(customersCard!).getByText("No customers yet")).toBeTruthy();
    expect(within(customersCard!).getByText("Customers will appear here as they are added.")).toBeTruthy();
  });
```

- [ ] **Step 4: Run the focused test to verify it fails**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: FAIL because the current card derives its content from follow-up eligibility and uses the follow-up empty-state copy.

### Task 2: Render the dashboard customer preview

**Files:**
- Modify: `src/features/dashboard/dashboard-overview.tsx:1-24, 64-67, 165, 213-242`
- Test: `src/features/dashboard/dashboard-overview.test.tsx`

**Interfaces:**
- Consumes: `customers: Customer[]`, each with `id`, `name`, and `stage`.
- Produces: A `Customers` overview card that renders `customerPreview`, individual profile links, a directory link, and customer-specific empty state.

- [ ] **Step 1: Remove the no-longer-used follow-up-only helper and derive the preview**

Delete the `CustomerStage` type import and the `isFollowUpCustomer` function. Replace the `followUps` declaration after `reminders` with:

```tsx
  const customerPreview = customers.slice(0, 5);
```

- [ ] **Step 2: Replace the detailed follow-up card with the customer preview**

Replace the entire overview `<article>` that currently starts with `<SectionTitle title="Needs follow-up" ... />` with:

```tsx
        <article className="min-h-[218px] rounded-[10px] border border-[#e6e6e8] bg-white p-4">
          <SectionTitle title="Customers" icon={UserPlus} />
          {customerPreview.length === 0 ? (
            <div className="mt-3">
              <DashboardEmptyState
                title="No customers yet"
                body="Customers will appear here as they are added."
              />
            </div>
          ) : (
            <>
              <div className="mt-3 divide-y divide-[#f0f0f1]">
                {customerPreview.map((customer) => (
                  <a
                    key={customer.id}
                    href={`/dashboard/customers/${customer.id}`}
                    className="flex items-center justify-between gap-3 py-2 text-[11px] transition-colors hover:text-violet-700"
                  >
                    <span>
                      <span className="block font-normal leading-tight">{customer.name}</span>
                      <span className="mt-0.5 block text-[10px] leading-tight text-[#96979c]">
                        {stageLabels[customer.stage]}
                      </span>
                    </span>
                    <span className="text-[10px] leading-tight text-[#77787d]">View profile</span>
                  </a>
                ))}
              </div>
              <a
                href="/dashboard/customers"
                className="mt-3 inline-block text-[10px] leading-tight text-violet-700 transition-colors hover:text-violet-800"
              >
                View all customers
              </a>
            </>
          )}
        </article>
```

- [ ] **Step 3: Run the focused test to verify it passes**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: PASS with every overview test green, including the two new customer-preview tests.

- [ ] **Step 4: Run the dashboard model tests to confirm the metric behavior remains independent**

Run: `npm test -- src/features/dashboard/dashboard-model.test.ts`

Expected: PASS, including the existing `needsFollowUp` metric assertions.

- [ ] **Step 5: Run lint and the full test suite**

Run: `npm run lint && npm test`

Expected: Both commands exit with status `0`; no lint errors and no failing tests.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/features/dashboard/dashboard-overview.tsx src/features/dashboard/dashboard-overview.test.tsx
git commit -m "feat(dashboard): show customer preview"
```
