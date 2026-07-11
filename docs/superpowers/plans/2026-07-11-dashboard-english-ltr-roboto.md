# Dashboard English LTR and Roboto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the complete admin dashboard and its demo data to English, mirror its layout from RTL to LTR, and apply Roboto only inside the dashboard.

**Architecture:** Keep the existing dashboard routes, components, state, enum keys, and behavior. Translate display strings in place, mirror only direction-dependent classes and attributes at their current ownership boundaries, and scope the Roboto font through `.dashboard-app` in the shared stylesheet.

**Tech Stack:** React 19, TypeScript, TanStack Router, Tailwind CSS 4, Vitest, Testing Library, Vite.

## Global Constraints

- Preserve the current uncommitted functional and layout changes; stage only files named by the active task.
- Translate every user-visible dashboard string and all demo data into concise, natural English.
- Keep internal identifiers, route paths, enum keys, data types, state behavior, and responsive breakpoints unchanged.
- Use `lang="en"` and `dir="ltr"` at the dashboard root.
- Move the desktop sidebar and mobile drawer to the left and mirror all direction-dependent spacing, borders, alignment, and search-icon placement.
- Apply Roboto only within `.dashboard-app`; do not change public-page typography.
- Do not add an i18n framework, runtime language switcher, or new persistence.
- Do not rebase, amend, squash, force-push, or otherwise rewrite published history because this repository is connected to Lovable.

## File Map

- `src/styles.css`: load Roboto and assign it only to `.dashboard-app` and its controls.
- `src/features/dashboard/dashboard-shell.tsx`: English navigation and page copy, LTR semantics, left desktop sidebar, left mobile drawer, and mirrored content offset.
- `src/features/dashboard/dashboard-shell.test.tsx`: shell copy, direction, language, and navigation regression coverage.
- `src/routes/dashboard.tsx`: English dashboard document title.
- `src/features/dashboard/dashboard-model.ts`: English display-label maps; business keys and calculations stay unchanged.
- `src/features/dashboard/dashboard-data.ts`: translated customer names, notes, activities, and appointment purposes.
- `src/features/dashboard/dashboard-model.test.ts`: English fixtures and label-map assertions.
- `src/features/dashboard/dashboard-ui.tsx`: English metric comparison and shared empty-state copy.
- `src/features/dashboard/dashboard-overview.tsx`: English overview copy and LTR table/legend alignment.
- `src/features/dashboard/dashboard-overview.test.tsx`: overview interaction and English copy assertions.
- `src/features/dashboard/dashboard-bookings.tsx`: English booking copy, errors, toast text, dialog direction, and mirrored search/table alignment.
- `src/features/dashboard/dashboard-bookings.test.tsx`: English query, validation, dialog, and demo-data assertions.
- `src/features/dashboard/dashboard-customers.tsx`: English customer directory and mirrored search control.
- `src/features/dashboard/dashboard-customers.test.tsx`: English demo-name filtering.
- `src/features/dashboard/dashboard-customer-profile.tsx`: English profile copy, messages, and LTR activity rail.
- `src/features/dashboard/dashboard-customer-profile.test.tsx`: English labels and note interaction.
- `src/routes/dashboard/customers/$id.tsx`: English missing-customer state.
- `src/features/dashboard/dashboard-availability.tsx`: English weekday/reminder copy and accessibility labels.
- `src/features/dashboard/dashboard-availability.test.tsx`: English slot and reminder interaction.
- `scripts/verify-dashboard.mjs`: English navigation checks plus Arabic-script, semantics, direction, and Roboto guardrails.

---

### Task 1: Dashboard shell semantics, direction, and typography

**Files:**
- Modify: `src/features/dashboard/dashboard-shell.test.tsx`
- Modify: `src/features/dashboard/dashboard-shell.tsx`
- Modify: `src/styles.css`
- Modify: `src/routes/dashboard.tsx`

**Interfaces:**
- Consumes: existing `DashboardShell({ children }: { children: ReactNode })` and `.dashboard-app` scope.
- Produces: an English LTR shell with a left sidebar/drawer and dashboard-scoped Roboto styling used by every later task.

- [ ] **Step 1: Write the failing shell test**

Replace the Arabic shell test with assertions for English navigation, semantic direction, and left-side layout:

```tsx
it("renders English LTR navigation and marks the current section", () => {
  const { container } = render(
    <DashboardShell>
      <p>Content</p>
    </DashboardShell>,
  );

  const root = container.firstElementChild;
  expect(root?.getAttribute("lang")).toBe("en");
  expect(root?.getAttribute("dir")).toBe("ltr");
  expect(screen.getByRole("link", { name: "Customers" }).getAttribute("aria-current")).toBe(
    "page",
  );
  expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
  expect(document.body.textContent).toContain("Demo version");
  expect(document.body.textContent).toContain("Reminders are not actually sent");
  expect(container.querySelector("aside")?.className).toContain("left-0");
});
```

- [ ] **Step 2: Run the shell test to verify it fails**

Run: `npm test -- src/features/dashboard/dashboard-shell.test.tsx`

Expected: FAIL because the shell still uses Arabic copy, `lang="ar"`, `dir="rtl"`, and `right-0`.

- [ ] **Step 3: Translate and mirror the shell**

In `dashboard-shell.tsx`, use these navigation and route labels:

```tsx
const dashboardNavigation = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Bookings", to: "/dashboard/bookings", icon: CalendarDays },
  { label: "Customers", to: "/dashboard/customers", icon: Users },
  { label: "Availability", to: "/dashboard/availability", icon: Clock3 },
] as const;

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/bookings": "Bookings",
  "/dashboard/customers": "Customers",
  "/dashboard/availability": "Availability",
};

const pageDescriptions: Record<string, string> = {
  "/dashboard": "A quick view of your appointments and atelier bookings",
  "/dashboard/bookings": "Manage design and workshop bookings in one place",
  "/dashboard/customers": "Customer profiles, production stages, and upcoming appointments",
  "/dashboard/availability": "Set available time slots and reminder preferences",
};
```

Use `Customer profile` / `Appointments, notes, and current production stage` for the nested customer route. Translate the remaining shell copy to `Main navigation`, `Atelier management`, `New appointment`, `Workspace`, `Demo version`, `Reminders are not actually sent`, `Dashboard menu`, `Dashboard navigation links`, `Open menu`, and `Atelier admin dashboard`.

Apply these direction changes without altering current widths or max-width work:

```tsx
<div className="dashboard-app min-h-screen bg-white text-[#161619]" dir="ltr" lang="en">
<aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-[#e9e9eb] bg-white lg:block">
<SheetContent side="left" className="w-64 border-[#e9e9eb] bg-white p-0" dir="ltr">
<div className="lg:pl-56">
```

Remove now-redundant `dir="ltr"` attributes from English-only brand/header text.

- [ ] **Step 4: Scope Roboto to the dashboard and translate the route title**

Add the font import before other CSS imports and replace the dashboard font family:

```css
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap");

.dashboard-app,
.dashboard-app button,
.dashboard-app input,
.dashboard-app select,
.dashboard-app textarea {
  font-family: "Roboto", ui-sans-serif, system-ui, sans-serif;
}
```

Keep the existing `.dashboard-app` weight, color scheme, numeric variant, and motion rules. In `src/routes/dashboard.tsx`, set the title to `Dashboard | Besan Khalaily`.

- [ ] **Step 5: Run the shell test and static checks**

Run: `npm test -- src/features/dashboard/dashboard-shell.test.tsx`

Expected: PASS.

Run: `rg -n 'dir="rtl"|lang="ar"|right-0|border-l|lg:pr-56|font-arabic' src/features/dashboard/dashboard-shell.tsx src/styles.css`

Expected: no matches.

- [ ] **Step 6: Commit the shell conversion**

```powershell
git add -- src/features/dashboard/dashboard-shell.test.tsx src/features/dashboard/dashboard-shell.tsx src/styles.css src/routes/dashboard.tsx
git commit -m "feat: convert dashboard shell to English LTR"
```

---

### Task 2: English label maps and demo data

**Files:**
- Modify: `src/features/dashboard/dashboard-model.test.ts`
- Modify: `src/features/dashboard/dashboard-model.ts`
- Modify: `src/features/dashboard/dashboard-data.ts`

**Interfaces:**
- Consumes: existing `CustomerStage`, `BookingType`, `AppointmentStatus`, `ReminderStatus`, `WorkingDay`, and `demoDashboardState` shapes.
- Produces: English label records and English demo records consumed unchanged by all feature views.

- [ ] **Step 1: Write failing English label and demo-data assertions**

Import the label maps and demo state, translate the existing fixture fields to `Layan Mansour` and `Initial consultation`, and add:

```ts
expect(stageLabels["new-inquiry"]).toBe("New inquiry");
expect(bookingTypeLabels.workshop).toBe("Workshop");
expect(appointmentStatusLabels.confirmed).toBe("Confirmed");
expect(reminderStatusLabels.scheduled).toBe("Scheduled");
expect(workingDayLabels.sunday).toBe("Sunday");
expect(demoDashboardState.customers[0].name).toBe("Layan Mansour");
expect(demoDashboardState.appointments[0].purpose).toBe("Initial consultation");
expect(JSON.stringify(demoDashboardState)).not.toMatch(/[\u0600-\u06ff]/);
```

- [ ] **Step 2: Run the model test to verify it fails**

Run: `npm test -- src/features/dashboard/dashboard-model.test.ts`

Expected: FAIL on Arabic labels and demo content.

- [ ] **Step 3: Translate the display-label records**

Keep every record key unchanged and use these values:

```ts
export const stageLabels: Record<CustomerStage, string> = {
  "new-inquiry": "New inquiry",
  "initial-appointment": "Initial appointment",
  "measurements-taken": "Measurements taken",
  "design-production": "Design and production",
  fitting: "Fitting",
  "ready-delivery": "Ready for delivery",
  completed: "Completed",
};

export const bookingTypeLabels = { workshop: "Workshop", design: "Design" };
export const appointmentStatusLabels = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const reminderStatusLabels = {
  "not-scheduled": "Not scheduled",
  scheduled: "Scheduled",
  sent: "Sent",
};
export const workingDayLabels = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
};
```

Retain the existing explicit `Record<...>` annotations.

- [ ] **Step 4: Translate every demo record**

Use the customer names `Layan Mansour`, `Sarah Khalil`, `Noor Hamdan`, `Mariam Odeh`, `Tala Darwish`, and `Reem Shehadeh`. Translate the first activity to `Customer profile created`, the note to `Prefers natural fabrics with a relaxed silhouette.`, and appointment purposes to:

```ts
[
  "Initial consultation",
  "Measurements",
  "Corset workshop",
  "First fitting",
  "Garment delivery",
  "Patternmaking fundamentals workshop",
  "Fabric consultation",
  "Private mini course",
  "Measurement appointment",
  "One-day workshop",
]
```

Do not change IDs, phone numbers, timestamps, enum keys, or reminder settings.

- [ ] **Step 5: Run the model test and Arabic scan**

Run: `npm test -- src/features/dashboard/dashboard-model.test.ts`

Expected: PASS.

Run: `rg -n '[\p{Arabic}]' src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-data.ts src/features/dashboard/dashboard-model.test.ts`

Expected: no matches.

- [ ] **Step 6: Commit label and demo-data translation**

```powershell
git add -- src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-data.ts
git commit -m "feat: translate dashboard demo data"
```

---

### Task 3: English overview and shared dashboard UI

**Files:**
- Modify: `src/features/dashboard/dashboard-overview.test.tsx`
- Modify: `src/features/dashboard/dashboard-overview.tsx`
- Modify: `src/features/dashboard/dashboard-ui.tsx`

**Interfaces:**
- Consumes: English label maps and `demoDashboardState` from Task 2, plus the existing `MetricCard`, `StatusBadge`, and `DashboardEmptyState` APIs.
- Produces: a fully English overview with LTR table alignment; component props remain unchanged.

- [ ] **Step 1: Update the overview tests to fail on English expectations**

Use `Today's appointments`, `Week`, `This week's appointments`, `Tomorrow's reminders`, and `Needs follow-up`. Add assertions for `Total bookings`, `Compared with last month`, and `Layan Mansour`.

```tsx
expect(screen.getByRole("heading", { name: "Today's appointments" })).toBeTruthy();
fireEvent.click(screen.getByRole("button", { name: "Week" }));
expect(screen.getByRole("heading", { name: "This week's appointments" })).toBeTruthy();
expect(screen.getByText("Tomorrow's reminders")).toBeTruthy();
expect(screen.getAllByText("Needs follow-up").length).toBeGreaterThan(0);
```

- [ ] **Step 2: Run the overview test to verify it fails**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: FAIL because overview and shared metric copy are Arabic.

- [ ] **Step 3: Translate overview and shared UI copy**

Translate every visible and accessible string in the two source files. Use the key terms `Total bookings`, `Today's appointments`, `New customers`, `Needs follow-up`, `New`, `Compared with last month`, `Reminder progress`, `Booking status distribution`, `Customer progress`, `In progress`, `Advanced`, `Completed`, `Day`, `Week`, `Customer`, `Service`, `Purpose`, `Date and time`, `Status`, `Tomorrow's reminders`, `Scheduled`, and `View profile`.

Use natural English empty states: `No appointments`, `Choose another range or add a new appointment.`, `No reminders scheduled`, `Tomorrow's appointments will appear here.`, `All profiles are up to date`, and `No follow-up is currently required.`

Change overview table classes from `text-right` to `text-left`. Preserve the user's current metric-comparison implementation and layout-width edits.

- [ ] **Step 4: Run overview tests and scan the files**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: PASS.

Run: `rg -n '[\p{Arabic}]|text-right' src/features/dashboard/dashboard-overview.tsx src/features/dashboard/dashboard-ui.tsx src/features/dashboard/dashboard-overview.test.tsx`

Expected: no matches.

- [ ] **Step 5: Commit the overview conversion**

```powershell
git add -- src/features/dashboard/dashboard-overview.test.tsx src/features/dashboard/dashboard-overview.tsx src/features/dashboard/dashboard-ui.tsx
git commit -m "feat: translate dashboard overview"
```

---

### Task 4: English bookings workflow and LTR controls

**Files:**
- Modify: `src/features/dashboard/dashboard-bookings.test.tsx`
- Modify: `src/features/dashboard/dashboard-bookings.tsx`

**Interfaces:**
- Consumes: existing `filterAppointments`, `validateAppointment`, `DashboardBookings`, English label maps, and English demo state.
- Produces: the same booking filtering, validation, create/edit, and dispatch behavior with English copy and LTR controls.

- [ ] **Step 1: Update booking tests to fail on English behavior**

Change the query to `Layan`, expect two matches, and expect validation errors `Select a customer.` and `Enter the appointment purpose.`. In the component test, use `Search bookings`, expect `Layan Mansour`, click `New appointment`, and assert the dialog heading is `New appointment`.

- [ ] **Step 2: Run booking tests to verify they fail**

Run: `npm test -- src/features/dashboard/dashboard-bookings.test.tsx`

Expected: FAIL on Arabic validation and interface copy.

- [ ] **Step 3: Translate booking copy and feedback**

Translate all validation, overlap, success-toast, filter, option, table, action, dialog, and form strings. Use `Appointment saved.`, `Appointment updated.`, `This time overlaps another appointment.`, `Search bookings`, `Type`, `Status`, `Date`, `All`, `Workshop`, `Design`, `Pending confirmation`, `Confirmed`, `Completed`, `Cancelled`, `New appointment`, `No bookings`, `Try changing the search or filters.`, `Customer`, `Reminder`, `Action`, `Edit`, `Edit appointment`, `Select a customer`, `Appointment purpose`, `Time`, `Save changes`, and `Add appointment`.

- [ ] **Step 4: Mirror booking-specific direction styles**

Move search icons from `right-3` to `left-3`, change input padding from `pr-9` to `pl-9`, change table alignment from `text-right` to `text-left`, and change `<DialogContent dir="rtl">` to `dir="ltr"`. Remove redundant LTR attributes from phone/time values only if their visual behavior remains identical.

- [ ] **Step 5: Run booking tests and source scans**

Run: `npm test -- src/features/dashboard/dashboard-bookings.test.tsx`

Expected: PASS.

Run: `rg -n '[\p{Arabic}]|dir="rtl"|text-right|right-3|pr-9' src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx`

Expected: no matches.

- [ ] **Step 6: Commit the booking conversion**

```powershell
git add -- src/features/dashboard/dashboard-bookings.test.tsx src/features/dashboard/dashboard-bookings.tsx
git commit -m "feat: translate dashboard bookings"
```

---

### Task 5: English customer directory and profile

**Files:**
- Modify: `src/features/dashboard/dashboard-customers.test.tsx`
- Modify: `src/features/dashboard/dashboard-customers.tsx`
- Modify: `src/features/dashboard/dashboard-customer-profile.test.tsx`
- Modify: `src/features/dashboard/dashboard-customer-profile.tsx`
- Modify: `src/routes/dashboard/customers/$id.tsx`

**Interfaces:**
- Consumes: English demo customers, existing customer filter, profile dispatch actions, and route lookup.
- Produces: English searchable directory and customer profile without changing dispatch payloads or route behavior.

- [ ] **Step 1: Update customer tests to fail on English UI**

In the directory test, search via `Search customers` for `Layan`, expect `Layan Mansour`, and ensure `Sarah Khalil` is absent. In the profile test, use `Customer stage`, enter `Confirm the fabric before the fitting` into `New note`, click `Add note`, and retain the exact existing dispatch assertions.

- [ ] **Step 2: Run customer tests to verify they fail**

Run: `npm test -- src/features/dashboard/dashboard-customers.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx`

Expected: FAIL because labels and demo names are still mismatched until the views are translated.

- [ ] **Step 3: Translate the directory and mirror its search control**

Use `Search customers`, `No results`, `Check the name or phone number.`, and `No upcoming appointment`. Move the search icon from `right-3` to `left-3` and input padding from `pr-9` to `pl-9`.

- [ ] **Step 4: Translate the profile and route fallback**

Use `Customer stage updated.`, `Write a note before saving.`, `Note added.`, `Details will appear here when available.`, `Customer stage`, `Upcoming appointments`, `Previous appointments`, `No upcoming appointments`, `No previous appointments`, `New note`, `Add note`, `Activity`, `No activity yet`, `Updates will appear here.`, `Notes`, and `No notes.`. Translate the missing-customer route state to `Customer not found`.

Mirror the activity rail from `border-r-2 pr-3` to `border-l-2 pl-3`. Keep phone numbers and timestamps readable in LTR.

- [ ] **Step 5: Run customer tests and scan the files**

Run: `npm test -- src/features/dashboard/dashboard-customers.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx`

Expected: PASS.

Run: `rg -n '[\p{Arabic}]|right-3|pr-9|border-r-2' src/features/dashboard/dashboard-customers.tsx src/features/dashboard/dashboard-customer-profile.tsx src/routes/dashboard/customers/'$id.tsx'`

Expected: no matches.

- [ ] **Step 6: Commit customer conversion**

```powershell
git add -- src/features/dashboard/dashboard-customers.test.tsx src/features/dashboard/dashboard-customers.tsx src/features/dashboard/dashboard-customer-profile.test.tsx src/features/dashboard/dashboard-customer-profile.tsx 'src/routes/dashboard/customers/$id.tsx'
git commit -m "feat: translate dashboard customers"
```

---

### Task 6: English availability, verification guardrails, and final QA

**Files:**
- Modify: `src/features/dashboard/dashboard-availability.test.tsx`
- Modify: `src/features/dashboard/dashboard-availability.tsx`
- Modify: `scripts/verify-dashboard.mjs`

**Interfaces:**
- Consumes: English `workingDayLabels`, existing availability/reminder dispatch actions, and all converted dashboard runtime files.
- Produces: English availability controls and a static verification script that prevents Arabic/RTL regressions.

- [ ] **Step 1: Update the availability test to fail in English**

Click the slot named `Sunday 10:00 to 11:00 available`, retain the exact `availability/toggle` assertion, click `Remind customer via WhatsApp`, and retain the `reminders/update` assertion.

- [ ] **Step 2: Strengthen the static verification script before implementation**

Change required navigation labels to `Dashboard`, `Bookings`, `Customers`, and `Availability`. Read all runtime dashboard `.ts`/`.tsx` files recursively and fail when `/[\u0600-\u06ff]/` matches. Add exact shell assertions for `dir="ltr"`, `lang="en"`, `left-0`, `side="left"`, and `lg:pl-56`, and assert `styles.css` contains both `Roboto` and `.dashboard-app`.

- [ ] **Step 3: Run focused checks to verify they fail**

Run: `npm test -- src/features/dashboard/dashboard-availability.test.tsx`

Expected: FAIL on Arabic accessible labels.

Run: `node scripts/verify-dashboard.mjs`

Expected: FAIL until availability and any remaining Arabic runtime strings are converted.

- [ ] **Step 4: Translate availability and reminder copy**

Translate all headings, descriptions, weekday summaries, slot states, aria labels, reminder controls, and simulated-delivery notice. Use `Weekly availability`, `Available`, `Unavailable`, `Reminder settings`, `Remind customer via WhatsApp`, `Notify supervisor in the dashboard`, `24 hours before the appointment`, and `Reminder delivery is simulated in this demo.`. Generate slot labels in the form `${day} ${startsAt} to ${endsAt} ${enabled ? "available" : "unavailable"}`.

- [ ] **Step 5: Run focused tests and the no-Arabic guardrail**

Run: `npm test -- src/features/dashboard/dashboard-availability.test.tsx`

Expected: PASS.

Run: `node scripts/verify-dashboard.mjs`

Expected: exits with code 0 and no output.

Run: `rg -n '[\p{Arabic}]|dir="rtl"|lang="ar"|text-right|right-0|side="right"|lg:pr-56' src/features/dashboard src/routes/dashboard.tsx src/routes/dashboard scripts/verify-dashboard.mjs`

Expected: no matches. Arabic design/plan documents are outside this runtime scan.

- [ ] **Step 6: Run the complete automated verification**

Run: `npm test`

Expected: all tests pass.

Run: `npm run lint`

Expected: exits with code 0.

Run: `npm run build`

Expected: production build completes successfully.

- [ ] **Step 7: Perform desktop and mobile visual verification**

Start the app with `npm run dev -- --host 127.0.0.1`, open `/dashboard`, `/dashboard/bookings`, `/dashboard/customers`, one customer profile, and `/dashboard/availability` at approximately 1440×900 and 390×844. Confirm English copy, Roboto rendering, left sidebar/drawer, left-aligned tables and search controls, correct dialog direction, no clipping, and unchanged interactions. Stop the dev server after verification.

- [ ] **Step 8: Commit availability and verification changes**

```powershell
git add -- src/features/dashboard/dashboard-availability.test.tsx src/features/dashboard/dashboard-availability.tsx scripts/verify-dashboard.mjs
git commit -m "test: verify English LTR dashboard"
```

---

## Completion Checklist

- [ ] `git diff --check` reports no whitespace errors.
- [ ] `git status --short` contains no unexpected files; any pre-existing user changes are preserved.
- [ ] All dashboard runtime and test strings are English.
- [ ] Dashboard root is English LTR and all directional layout is mirrored.
- [ ] Roboto is scoped to the dashboard.
- [ ] Focused tests, full tests, lint, build, static verification, and visual QA all pass.
