# Besan Atelier Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, frontend-only Arabic admin dashboard for workshop and design bookings, customer profiles, availability, and simulated reminders.

**Architecture:** A parent `/dashboard` route owns a scoped RTL shell and an in-memory React state provider. Nested route files assemble focused feature components for overview, bookings, customers, customer profiles, and availability; pure domain helpers own metrics, filtering, validation, and overlap checks so those rules remain independently testable.

**Tech Stack:** React 19, TanStack Start/Router, TypeScript, Tailwind CSS 4, Radix UI components, Lucide icons, date-fns, Vitest, and Testing Library.

## Global Constraints

- The implementation is frontend-only: no authentication, server API, database, production notification delivery, or role system.
- Use nested routes: `/dashboard`, `/dashboard/bookings`, `/dashboard/customers`, `/dashboard/customers/:id`, and `/dashboard/availability`.
- Keep all dashboard copy Arabic and all dashboard layouts RTL; isolate phone numbers and times with `dir="ltr"` where rendered.
- Match the approved reference: white surfaces, light gray borders, rounded cards, near-black text, purple active states, and green confirmed states.
- Demo mutations live only in React memory and reset on full page refresh; do not use `localStorage`.
- Availability covers Sunday through Thursday with one-hour slots from 10:00–11:00 through 17:00–18:00.
- Reminders are simulated as customer WhatsApp and supervisor in-dashboard reminders 24 hours before appointments.
- Tables become stacked rows on small screens, the sidebar becomes a mobile drawer, and touch targets remain at least 40px.
- All icon-only controls require Arabic accessible labels; focus styles must be visible and reduced-motion preferences respected.
- Preserve the existing public-site typography and behavior outside `/dashboard`.
- Do not edit `src/routeTree.gen.ts` by hand; allow the TanStack plugin to regenerate it during development/build.

## File Structure

### Shared dashboard domain

- `src/features/dashboard/dashboard-model.ts`: exact domain types, labels, filters, schedule metrics, slot generation, and overlap detection.
- `src/features/dashboard/dashboard-model.test.ts`: pure domain tests.
- `src/features/dashboard/dashboard-data.ts`: believable Arabic demo customers, appointments, notes, activity, slots, and reminder settings.
- `src/features/dashboard/dashboard-store.tsx`: reducer, provider, shared selectors, and `useDashboard()`.
- `src/features/dashboard/dashboard-store.test.tsx`: reducer and session-state behavior.
- `src/features/dashboard/dashboard-ui.tsx`: shared status badges, empty state, metric card, and section heading.

### Shell and routes

- `src/features/dashboard/dashboard-shell.tsx`: desktop right sidebar, mobile sheet navigation, header, and demo reminder notice.
- `src/features/dashboard/dashboard-shell.test.tsx`: active navigation and accessible mobile controls.
- `src/routes/dashboard.tsx`: parent route, scoped metadata, provider, shell, and `<Outlet />`.
- `src/routes/dashboard/index.tsx`: overview route.
- `src/routes/dashboard/bookings.tsx`: bookings route.
- `src/routes/dashboard/customers/index.tsx`: customer directory route.
- `src/routes/dashboard/customers/$id.tsx`: customer profile route.
- `src/routes/dashboard/availability.tsx`: availability route.
- `src/routes/__root.tsx`: add the Arabic font stylesheet only.
- `src/styles.css`: add a scoped dashboard font token and dashboard-only surface variables.

### Features

- `src/features/dashboard/dashboard-overview.tsx` and `.test.tsx`: metrics, day/week switcher, schedule, reminders, and follow-up list.
- `src/features/dashboard/dashboard-bookings.tsx` and `.test.tsx`: filters, responsive list/table, and new/edit appointment dialog.
- `src/features/dashboard/dashboard-customers.tsx` and `.test.tsx`: searchable directory and customer summaries.
- `src/features/dashboard/dashboard-customer-profile.tsx` and `.test.tsx`: identity, stage, appointments, notes, and activity.
- `src/features/dashboard/dashboard-availability.tsx` and `.test.tsx`: slot editor and reminder settings.
- `scripts/verify-dashboard.mjs`: route/file/content guard matching the established workshops verification pattern.

---

### Task 1: Domain model, demo data, and scheduling rules

**Files:**
- Create: `src/features/dashboard/dashboard-model.ts`
- Create: `src/features/dashboard/dashboard-model.test.ts`
- Create: `src/features/dashboard/dashboard-data.ts`

**Interfaces:**
- Produces: `CustomerStage`, `BookingType`, `AppointmentStatus`, `ReminderStatus`, `Customer`, `Appointment`, `AvailabilitySlot`, `ReminderSettings`, `DashboardState`, `DashboardMetrics`, `createAvailabilitySlots()`, `getDashboardMetrics()`, `appointmentsOverlap()`, and Arabic label maps.
- Consumes: No dashboard implementation files.

- [ ] **Step 1: Write failing domain tests**

```ts
import { describe, expect, it } from "vitest";
import {
  appointmentsOverlap,
  createAvailabilitySlots,
  getDashboardMetrics,
  type Appointment,
  type Customer,
} from "./dashboard-model";

const customers: Customer[] = [
  {
    id: "customer-1",
    name: "ليان منصور",
    phone: "+970 59 123 4567",
    stage: "new-inquiry",
    updatedAt: "2026-07-05T08:00:00.000Z",
    notes: [],
    activity: [],
  },
];

const appointments: Appointment[] = [
  {
    id: "appointment-1",
    customerId: "customer-1",
    type: "design",
    purpose: "جلسة أولى",
    startsAt: "2026-07-10T10:00:00.000Z",
    endsAt: "2026-07-10T11:00:00.000Z",
    status: "confirmed",
    reminderStatus: "scheduled",
  },
];

describe("createAvailabilitySlots", () => {
  it("creates eight hourly slots for each of five working days", () => {
    const slots = createAvailabilitySlots();
    expect(slots).toHaveLength(40);
    expect(slots[0]).toMatchObject({ day: "sunday", startsAt: "10:00", endsAt: "11:00" });
    expect(slots.at(-1)).toMatchObject({ day: "thursday", startsAt: "17:00", endsAt: "18:00" });
  });
});

describe("appointmentsOverlap", () => {
  it("detects intersecting times and permits adjacent times", () => {
    expect(appointmentsOverlap(appointments[0], "2026-07-10T10:30:00.000Z", "2026-07-10T11:30:00.000Z")).toBe(true);
    expect(appointmentsOverlap(appointments[0], "2026-07-10T11:00:00.000Z", "2026-07-10T12:00:00.000Z")).toBe(false);
  });
});

describe("getDashboardMetrics", () => {
  it("derives operational totals from shared state", () => {
    expect(getDashboardMetrics(customers, appointments, new Date("2026-07-10T08:00:00.000Z"))).toEqual({
      today: 1,
      thisWeek: 1,
      newCustomers: 1,
      needsFollowUp: 1,
    });
  });
});
```

- [ ] **Step 2: Run the domain test and verify failure**

Run: `npm test -- src/features/dashboard/dashboard-model.test.ts`

Expected: FAIL because `dashboard-model.ts` does not exist.

- [ ] **Step 3: Implement exact types, labels, and pure scheduling helpers**

```ts
export const customerStages = [
  "new-inquiry",
  "initial-appointment",
  "measurements-taken",
  "design-production",
  "fitting",
  "ready-delivery",
  "completed",
] as const;

export type CustomerStage = (typeof customerStages)[number];
export type BookingType = "workshop" | "design";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type ReminderStatus = "not-scheduled" | "scheduled" | "sent";
export type WorkingDay = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday";

export type CustomerNote = { id: string; body: string; createdAt: string };
export type CustomerActivity = { id: string; label: string; createdAt: string };

export type Customer = {
  id: string;
  name: string;
  phone: string;
  stage: CustomerStage;
  updatedAt: string;
  notes: CustomerNote[];
  activity: CustomerActivity[];
};

export type Appointment = {
  id: string;
  customerId: string;
  type: BookingType;
  purpose: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reminderStatus: ReminderStatus;
};

export type AvailabilitySlot = {
  id: string;
  day: WorkingDay;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
};

export type ReminderSettings = {
  customerWhatsapp: boolean;
  supervisorDashboard: boolean;
  hoursBefore: 24;
};

export type DashboardState = {
  customers: Customer[];
  appointments: Appointment[];
  availability: AvailabilitySlot[];
  reminderSettings: ReminderSettings;
};

export type DashboardMetrics = {
  today: number;
  thisWeek: number;
  newCustomers: number;
  needsFollowUp: number;
};

export const stageLabels: Record<CustomerStage, string> = {
  "new-inquiry": "استفسار جديد",
  "initial-appointment": "موعد أولي",
  "measurements-taken": "تم أخذ القياسات",
  "design-production": "قيد التصميم والتنفيذ",
  fitting: "بروفة",
  "ready-delivery": "جاهز للتسليم",
  completed: "مكتمل",
};

export const workingDayLabels: Record<WorkingDay, string> = {
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
};

export function createAvailabilitySlots(): AvailabilitySlot[] {
  const days = Object.keys(workingDayLabels) as WorkingDay[];
  return days.flatMap((day) =>
    Array.from({ length: 8 }, (_, index) => {
      const hour = index + 10;
      return {
        id: `${day}-${hour}`,
        day,
        startsAt: `${String(hour).padStart(2, "0")}:00`,
        endsAt: `${String(hour + 1).padStart(2, "0")}:00`,
        enabled: index < 6,
      };
    }),
  );
}

export function appointmentsOverlap(
  appointment: Pick<Appointment, "startsAt" | "endsAt">,
  startsAt: string,
  endsAt: string,
) {
  return new Date(startsAt) < new Date(appointment.endsAt) && new Date(endsAt) > new Date(appointment.startsAt);
}

export function getDashboardMetrics(
  customers: Customer[],
  appointments: Appointment[],
  now = new Date(),
): DashboardMetrics {
  const dayKey = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return {
    today: appointments.filter((item) => item.startsAt.slice(0, 10) === dayKey).length,
    thisWeek: appointments.filter((item) => {
      const date = new Date(item.startsAt);
      return date >= now && date < weekEnd;
    }).length,
    newCustomers: customers.filter((item) => item.stage === "new-inquiry").length,
    needsFollowUp: customers.filter((item) => {
      const inactiveForThreeDays = now.getTime() - new Date(item.updatedAt).getTime() >= 3 * 24 * 60 * 60 * 1000;
      return inactiveForThreeDays && !["ready-delivery", "completed"].includes(item.stage);
    }).length,
  };
}
```

Create `dashboard-data.ts` as a typed fixture. Use these six customer identities and ten appointment records so the overview, filters, histories, reminders, and status variants all have deterministic coverage:

```ts
import { createAvailabilitySlots, type Appointment, type Customer, type DashboardState } from "./dashboard-model";

const customers: Customer[] = [
  { id: "customer-1", name: "ليان منصور", phone: "+970 59 123 4567", stage: "new-inquiry", updatedAt: "2026-07-05T08:00:00.000Z", notes: [], activity: [{ id: "activity-1", label: "تم إنشاء ملف الزبونة", createdAt: "2026-07-05T08:00:00.000Z" }] },
  { id: "customer-2", name: "سارة خليل", phone: "+970 56 456 7812", stage: "measurements-taken", updatedAt: "2026-07-08T09:30:00.000Z", notes: [{ id: "note-1", body: "تفضّل أقمشة طبيعية بقصّة هادئة.", createdAt: "2026-07-08T09:30:00.000Z" }], activity: [] },
  { id: "customer-3", name: "نور حمدان", phone: "+962 79 222 8811", stage: "design-production", updatedAt: "2026-07-09T11:00:00.000Z", notes: [], activity: [] },
  { id: "customer-4", name: "مريم عودة", phone: "+970 59 700 4432", stage: "fitting", updatedAt: "2026-07-06T12:00:00.000Z", notes: [], activity: [] },
  { id: "customer-5", name: "تالا درويش", phone: "+962 78 919 3030", stage: "ready-delivery", updatedAt: "2026-07-10T07:15:00.000Z", notes: [], activity: [] },
  { id: "customer-6", name: "ريم شحادة", phone: "+970 56 333 9021", stage: "completed", updatedAt: "2026-07-03T16:30:00.000Z", notes: [], activity: [] },
];

const appointments: Appointment[] = [
  { id: "appointment-1", customerId: "customer-1", type: "design", purpose: "جلسة أولى", startsAt: "2026-07-10T10:00:00.000Z", endsAt: "2026-07-10T11:00:00.000Z", status: "confirmed", reminderStatus: "sent" },
  { id: "appointment-2", customerId: "customer-2", type: "design", purpose: "أخذ القياسات", startsAt: "2026-07-10T12:00:00.000Z", endsAt: "2026-07-10T13:00:00.000Z", status: "confirmed", reminderStatus: "sent" },
  { id: "appointment-3", customerId: "customer-3", type: "workshop", purpose: "ورشة الكورسيه", startsAt: "2026-07-11T10:00:00.000Z", endsAt: "2026-07-11T11:00:00.000Z", status: "pending", reminderStatus: "scheduled" },
  { id: "appointment-4", customerId: "customer-4", type: "design", purpose: "بروفة أولى", startsAt: "2026-07-12T13:00:00.000Z", endsAt: "2026-07-12T14:00:00.000Z", status: "confirmed", reminderStatus: "scheduled" },
  { id: "appointment-5", customerId: "customer-5", type: "design", purpose: "تسليم القطعة", startsAt: "2026-07-13T15:00:00.000Z", endsAt: "2026-07-13T16:00:00.000Z", status: "confirmed", reminderStatus: "scheduled" },
  { id: "appointment-6", customerId: "customer-6", type: "workshop", purpose: "ورشة أساسيات الباترون", startsAt: "2026-07-02T10:00:00.000Z", endsAt: "2026-07-02T11:00:00.000Z", status: "completed", reminderStatus: "sent" },
  { id: "appointment-7", customerId: "customer-2", type: "design", purpose: "استشارة قماش", startsAt: "2026-07-07T14:00:00.000Z", endsAt: "2026-07-07T15:00:00.000Z", status: "completed", reminderStatus: "sent" },
  { id: "appointment-8", customerId: "customer-3", type: "workshop", purpose: "دورة مصغرة خاصة", startsAt: "2026-07-14T11:00:00.000Z", endsAt: "2026-07-14T12:00:00.000Z", status: "pending", reminderStatus: "not-scheduled" },
  { id: "appointment-9", customerId: "customer-4", type: "design", purpose: "موعد قياسات", startsAt: "2026-06-29T12:00:00.000Z", endsAt: "2026-06-29T13:00:00.000Z", status: "completed", reminderStatus: "sent" },
  { id: "appointment-10", customerId: "customer-1", type: "workshop", purpose: "ورشة يوم واحد", startsAt: "2026-07-15T16:00:00.000Z", endsAt: "2026-07-15T17:00:00.000Z", status: "cancelled", reminderStatus: "not-scheduled" },
];

export const demoDashboardState: DashboardState = {
  customers,
  appointments,
  availability: createAvailabilitySlots(),
  reminderSettings: { customerWhatsapp: true, supervisorDashboard: true, hoursBefore: 24 },
};
```

- [ ] **Step 4: Run the domain tests**

Run: `npm test -- src/features/dashboard/dashboard-model.test.ts`

Expected: PASS with three passing tests.

- [ ] **Step 5: Commit the domain layer**

```bash
git add src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-data.ts
git commit -m "feat: add dashboard domain model"
```

---

### Task 2: In-memory store and shared UI primitives

**Files:**
- Create: `src/features/dashboard/dashboard-store.tsx`
- Create: `src/features/dashboard/dashboard-store.test.tsx`
- Create: `src/features/dashboard/dashboard-ui.tsx`

**Interfaces:**
- Consumes: `DashboardState`, `Appointment`, `CustomerStage`, `ReminderSettings`, and `demoDashboardState` from Task 1.
- Produces: `DashboardAction`, `dashboardReducer(state, action)`, `DashboardProvider`, `useDashboard()`, `MetricCard`, `StatusBadge`, `DashboardEmptyState`, and `DashboardSectionHeading`.

- [ ] **Step 1: Write failing reducer and provider tests**

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardProvider, dashboardReducer, useDashboard } from "./dashboard-store";
import { demoDashboardState } from "./dashboard-data";

afterEach(cleanup);

function Harness() {
  const { state, dispatch } = useDashboard();
  return (
    <>
      <output aria-label="stage">{state.customers[0].stage}</output>
      <button onClick={() => dispatch({ type: "customer/stage", customerId: state.customers[0].id, stage: "fitting" })}>
        update
      </button>
    </>
  );
}

describe("dashboardReducer", () => {
  it("toggles only the requested availability slot", () => {
    const slot = demoDashboardState.availability[0];
    const next = dashboardReducer(demoDashboardState, { type: "availability/toggle", slotId: slot.id });
    expect(next.availability[0].enabled).toBe(!slot.enabled);
    expect(next.availability[1]).toEqual(demoDashboardState.availability[1]);
  });
});

describe("DashboardProvider", () => {
  it("shares mutations with consumers during the mounted session", () => {
    render(<DashboardProvider><Harness /></DashboardProvider>);
    fireEvent.click(screen.getByRole("button", { name: "update" }));
    expect(screen.getByLabelText("stage").textContent).toBe("fitting");
  });
});
```

- [ ] **Step 2: Run the store test and verify failure**

Run: `npm test -- src/features/dashboard/dashboard-store.test.tsx`

Expected: FAIL because the store does not exist.

- [ ] **Step 3: Implement reducer and provider**

Define this exact action union and keep every update immutable:

```tsx
export type DashboardAction =
  | { type: "appointment/add"; appointment: Appointment }
  | { type: "appointment/update"; appointment: Appointment }
  | { type: "customer/stage"; customerId: string; stage: CustomerStage }
  | { type: "customer/note"; customerId: string; note: CustomerNote }
  | { type: "availability/toggle"; slotId: string }
  | { type: "reminders/update"; settings: ReminderSettings };

const DashboardContext = createContext<{
  state: DashboardState;
  dispatch: Dispatch<DashboardAction>;
} | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, demoDashboardState);
  return <DashboardContext.Provider value={{ state, dispatch }}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("useDashboard must be used inside DashboardProvider");
  return value;
}
```

Implement `dashboardReducer` for all six actions. `customer/note` must also update `updatedAt`; appointment mutations must preserve all unrelated appointments.

Create `dashboard-ui.tsx` with strongly typed props and Arabic output:

```tsx
export function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint: string; icon: LucideIcon })
export function StatusBadge({ status }: { status: AppointmentStatus })
export function DashboardEmptyState({ title, body }: { title: string; body: string })
export function DashboardSectionHeading({ title, action }: { title: string; action?: ReactNode })
```

Use `rounded-xl border border-slate-200 bg-white`, no decorative shadows, purple for active/accent elements, and green only for confirmed/completed states.

- [ ] **Step 4: Run store tests**

Run: `npm test -- src/features/dashboard/dashboard-store.test.tsx`

Expected: PASS with reducer and provider tests.

- [ ] **Step 5: Commit store and shared UI**

```bash
git add src/features/dashboard/dashboard-store.tsx src/features/dashboard/dashboard-store.test.tsx src/features/dashboard/dashboard-ui.tsx
git commit -m "feat: add dashboard session store"
```

---

### Task 3: RTL shell, scoped visual system, and nested route skeleton

**Files:**
- Create: `src/features/dashboard/dashboard-shell.tsx`
- Create: `src/features/dashboard/dashboard-shell.test.tsx`
- Create: `src/routes/dashboard.tsx`
- Create: `src/routes/dashboard/index.tsx`
- Create: `src/routes/dashboard/bookings.tsx`
- Create: `src/routes/dashboard/customers/index.tsx`
- Create: `src/routes/dashboard/customers/$id.tsx`
- Create: `src/routes/dashboard/availability.tsx`
- Modify: `src/routes/__root.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `DashboardProvider` from Task 2 and TanStack `Link`, `Outlet`, `useLocation`.
- Produces: stable dashboard navigation and compilable route boundaries consumed by Tasks 4–7.

- [ ] **Step 1: Write the failing shell test**

Mock router primitives so the component can be tested without a full router:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: "/dashboard/customers" }),
}));

import { DashboardShell } from "./dashboard-shell";

afterEach(cleanup);

describe("DashboardShell", () => {
  it("renders Arabic navigation and marks the current section", () => {
    render(<DashboardShell><p>المحتوى</p></DashboardShell>);
    expect(screen.getByRole("link", { name: "الزبائن" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "فتح القائمة" })).toBeTruthy();
    expect(screen.getByText("نسخة تجريبية — التذكيرات غير مرسلة فعليًا")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the shell test and verify failure**

Run: `npm test -- src/features/dashboard/dashboard-shell.test.tsx`

Expected: FAIL because `dashboard-shell.tsx` does not exist.

- [ ] **Step 3: Implement the shell and scoped dashboard tokens**

Use these exact navigation items:

```ts
const dashboardNavigation = [
  { label: "لوحة التحكم", to: "/dashboard", icon: LayoutDashboard },
  { label: "الحجوزات", to: "/dashboard/bookings", icon: CalendarDays },
  { label: "الزبائن", to: "/dashboard/customers", icon: Users },
  { label: "المواعيد المتاحة", to: "/dashboard/availability", icon: Clock3 },
] as const;
```

`DashboardShell` must render:

- `<div className="dashboard-app min-h-screen bg-slate-50" dir="rtl" lang="ar">`.
- A 224px right sidebar on `lg` screens and a Radix `Sheet` opened by a 40px mobile menu button.
- Active link styling with `bg-violet-50 text-violet-700` and `aria-current="page"`.
- A content header with title derived from the current path and a “موعد جديد” link to `/dashboard/bookings?new=1`.
- A subtle demo reminder notice.
- A scoped `Toaster` from `@/components/ui/sonner` so create/update actions produce short success toasts.
- The passed route children in `<main>`.

Modify `src/routes/__root.tsx` to add IBM Plex Sans Arabic to the existing Google Fonts URL without removing Cormorant Garamond or Inter. Add this scoped token to `src/styles.css`:

```css
@theme inline {
  --font-arabic: "IBM Plex Sans Arabic", "Noto Sans Arabic", ui-sans-serif, system-ui, sans-serif;
}

.dashboard-app {
  font-family: var(--font-arabic);
  font-weight: 400;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-app *, .dashboard-app *::before, .dashboard-app *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Add the nested routes**

Parent route:

```tsx
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { DashboardProvider } from "@/features/dashboard/dashboard-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "لوحة التحكم | Besan Khalaily" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  return <DashboardProvider><DashboardShell><Outlet /></DashboardShell></DashboardProvider>;
}
```

Each child route initially returns an Arabic `<h1>` matching its destination. Use `createFileRoute("/dashboard/")`, `createFileRoute("/dashboard/bookings")`, `createFileRoute("/dashboard/customers/")`, `createFileRoute("/dashboard/customers/$id")`, and `createFileRoute("/dashboard/availability")`. The `$id` component must read `Route.useParams()` and render the ID until Task 6 replaces it.

- [ ] **Step 5: Run shell tests and generate the route tree through a build**

Run: `npm test -- src/features/dashboard/dashboard-shell.test.tsx && npm run build`

Expected: shell test PASS; build PASS and `src/routeTree.gen.ts` includes all five dashboard URLs.

- [ ] **Step 6: Commit shell and routes**

```bash
git add src/features/dashboard/dashboard-shell.tsx src/features/dashboard/dashboard-shell.test.tsx src/routes/dashboard.tsx src/routes/dashboard src/routes/__root.tsx src/styles.css src/routeTree.gen.ts
git commit -m "feat: add dashboard route shell"
```

---

### Task 4: Overview metrics, schedule, reminders, and follow-up

**Files:**
- Create: `src/features/dashboard/dashboard-overview.tsx`
- Create: `src/features/dashboard/dashboard-overview.test.tsx`
- Modify: `src/routes/dashboard/index.tsx`

**Interfaces:**
- Consumes: `Customer[]`, `Appointment[]`, `getDashboardMetrics()`, `MetricCard`, `StatusBadge`, and profile links.
- Produces: `DashboardOverview({ customers, appointments, now? })`.

- [ ] **Step 1: Write the failing overview interaction test**

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { demoDashboardState } from "./dashboard-data";
import { DashboardOverview } from "./dashboard-overview";

afterEach(cleanup);

describe("DashboardOverview", () => {
  it("switches between day and week schedule views", () => {
    render(<DashboardOverview {...demoDashboardState} now={new Date("2026-07-10T08:00:00.000Z")} />);
    expect(screen.getByRole("heading", { name: "جدول اليوم" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "الأسبوع" }));
    expect(screen.getByRole("heading", { name: "جدول الأسبوع" })).toBeTruthy();
  });

  it("shows metrics, reminder queue, and follow-up customers", () => {
    render(<DashboardOverview {...demoDashboardState} now={new Date("2026-07-10T08:00:00.000Z")} />);
    expect(screen.getByText("مواعيد اليوم")).toBeTruthy();
    expect(screen.getByText("تذكيرات الغد")).toBeTruthy();
    expect(screen.getByText("بحاجة لمتابعة")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the overview test and verify failure**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: FAIL because the overview component does not exist.

- [ ] **Step 3: Implement the overview component**

`DashboardOverview` must:

- Render four `MetricCard` instances with `CalendarCheck2`, `CalendarRange`, `UserPlus`, and `CircleAlert`.
- Maintain `scheduleRange: "day" | "week"` in local state.
- Filter appointments against `now`, sort them ascending, and render customer name, purpose, time, type label, and status.
- Treat appointments on `now + 1 day` with `reminderStatus === "scheduled"` as tomorrow's queue.
- Treat every customer whose stage is neither `completed` nor `ready-delivery` and whose `updatedAt` is older than three days as needing follow-up.
- Render `DashboardEmptyState` when any list is empty.
- Use a 4-column metric grid on `xl`, 2 columns on `sm`, and one column on narrow screens.

Update the overview route to read `{ state } = useDashboard()` and pass `state.customers` and `state.appointments` into `DashboardOverview`.

- [ ] **Step 4: Run overview and existing tests**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: PASS with both overview tests.

- [ ] **Step 5: Commit the overview**

```bash
git add src/features/dashboard/dashboard-overview.tsx src/features/dashboard/dashboard-overview.test.tsx src/routes/dashboard/index.tsx
git commit -m "feat: add dashboard overview"
```

---

### Task 5: Unified bookings and appointment form

**Files:**
- Create: `src/features/dashboard/dashboard-bookings.tsx`
- Create: `src/features/dashboard/dashboard-bookings.test.tsx`
- Modify: `src/features/dashboard/dashboard-model.ts`
- Modify: `src/features/dashboard/dashboard-model.test.ts`
- Modify: `src/routes/dashboard/bookings.tsx`

**Interfaces:**
- Consumes: `Customer[]`, `Appointment[]`, `DashboardAction`, `appointmentsOverlap()`, shared badges and empty states.
- Produces: `BookingFilters`, `filterAppointments()`, `AppointmentFormValues`, `validateAppointment()`, and `DashboardBookings`.

- [ ] **Step 1: Write failing filter and validation tests**

Add pure tests that prove:

```ts
expect(filterAppointments(appointments, customers, { query: "ليان", type: "all", status: "all", date: "all" })).toHaveLength(1);
expect(filterAppointments(appointments, customers, { query: "", type: "workshop", status: "all", date: "all" }).every((item) => item.type === "workshop")).toBe(true);
expect(filterAppointments(appointments, customers, { query: "", type: "all", status: "all", date: "2026-07-10" }).every((item) => item.startsAt.startsWith("2026-07-10"))).toBe(true);
expect(validateAppointment({ customerId: "", type: "design", purpose: "", date: "", time: "" }, appointments)).toEqual({
  customerId: "اختاري الزبونة.",
  purpose: "أدخلي غرض الموعد.",
  date: "اختاري التاريخ.",
  time: "اختاري الوقت.",
});
```

Add a component test that searches by phone, filters to workshops, opens “موعد جديد”, preserves entered values after invalid submission, and dispatches `appointment/add` after valid input.

- [ ] **Step 2: Run booking tests and verify failure**

Run: `npm test -- src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-bookings.test.tsx`

Expected: FAIL because booking helpers and UI are absent.

- [ ] **Step 3: Implement filter and form validation helpers**

Use exact filter and form shapes:

```ts
export type BookingFilters = { query: string; type: BookingType | "all"; status: AppointmentStatus | "all"; date: string | "all" };
export type AppointmentFormValues = { customerId: string; type: BookingType; purpose: string; date: string; time: string };
export type AppointmentFormErrors = Partial<Record<keyof AppointmentFormValues | "overlap", string>>;
```

`filterAppointments` must normalize query whitespace and search customer name, phone, and appointment purpose. `validateAppointment` must require all fields, construct a one-hour ISO range, and return `overlap: "هذا الوقت محجوز بالفعل."` when a non-cancelled appointment intersects it.

- [ ] **Step 4: Implement the bookings UI**

`DashboardBookings` receives:

```tsx
type DashboardBookingsProps = {
  customers: Customer[];
  appointments: Appointment[];
  dispatch: Dispatch<DashboardAction>;
  openNewOnMount?: boolean;
};
```

Render a search input, type/status/date filters, desktop table, mobile stacked list, and Radix `Dialog`. Labels must be Arabic. The table columns are customer, type, purpose, date/time, status, reminder state, and actions. A successful submit dispatches `appointment/add`, closes the dialog, calls `toast.success("تمت إضافة الموعد.")`, and shows an equivalent `role="status"` message for screen readers. Editing uses the same dialog, dispatches `appointment/update`, and calls `toast.success("تم تحديث الموعد.")`.

Update `/dashboard/bookings` to read `new` from search params, consume `useDashboard()`, and pass `openNewOnMount={search.new === 1}`.

- [ ] **Step 5: Run booking tests**

Run: `npm test -- src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-bookings.test.tsx`

Expected: PASS for filtering, required fields, overlap feedback, new appointment, and responsive class assertions.

- [ ] **Step 6: Commit bookings**

```bash
git add src/features/dashboard/dashboard-model.ts src/features/dashboard/dashboard-model.test.ts src/features/dashboard/dashboard-bookings.tsx src/features/dashboard/dashboard-bookings.test.tsx src/routes/dashboard/bookings.tsx
git commit -m "feat: add dashboard booking management"
```

---

### Task 6: Customer directory and dedicated profiles

**Files:**
- Create: `src/features/dashboard/dashboard-customers.tsx`
- Create: `src/features/dashboard/dashboard-customers.test.tsx`
- Create: `src/features/dashboard/dashboard-customer-profile.tsx`
- Create: `src/features/dashboard/dashboard-customer-profile.test.tsx`
- Modify: `src/routes/dashboard/customers/index.tsx`
- Modify: `src/routes/dashboard/customers/$id.tsx`

**Interfaces:**
- Consumes: `Customer[]`, `Appointment[]`, `DashboardAction`, `stageLabels`, `StatusBadge`, and `DashboardEmptyState`.
- Produces: `DashboardCustomers`, `DashboardCustomerProfile`, and `findCustomerAppointments()`.

- [ ] **Step 1: Write failing customer tests**

Directory test:

```tsx
render(<DashboardCustomers customers={demoDashboardState.customers} appointments={demoDashboardState.appointments} />);
fireEvent.change(screen.getByLabelText("البحث عن زبونة"), { target: { value: "ليان" } });
expect(screen.getByRole("link", { name: /ليان منصور/ })).toBeTruthy();
expect(screen.queryByRole("link", { name: /سارة/ })).toBeNull();
```

Profile test:

```tsx
render(<DashboardCustomerProfile customer={customer} appointments={appointments} dispatch={dispatch} now={new Date("2026-07-10T08:00:00.000Z")} />);
fireEvent.change(screen.getByLabelText("مرحلة الزبونة"), { target: { value: "fitting" } });
expect(dispatch).toHaveBeenCalledWith({ type: "customer/stage", customerId: customer.id, stage: "fitting" });
fireEvent.change(screen.getByLabelText("ملاحظة جديدة"), { target: { value: "تأكيد القماش قبل البروفة" } });
fireEvent.click(screen.getByRole("button", { name: "إضافة الملاحظة" }));
expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "customer/note", customerId: customer.id }));
```

- [ ] **Step 2: Run customer tests and verify failure**

Run: `npm test -- src/features/dashboard/dashboard-customers.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx`

Expected: FAIL because both components are absent.

- [ ] **Step 3: Implement the directory**

`DashboardCustomers` must search normalized name and phone, derive the nearest future appointment per customer, and render name, LTR phone, stage label, next appointment, and latest-update date. Each customer link targets `/dashboard/customers/$id` with `{ id: customer.id }`. Render an explicit no-results state.

- [ ] **Step 4: Implement the profile**

`DashboardCustomerProfile` must render:

- Customer name, phone, and controlled stage select using all seven `customerStages`.
- Upcoming and previous appointments split around `now`, sorted nearest-first in each section.
- Note textarea requiring non-whitespace content and dispatching a timestamped `CustomerNote`.
- Existing notes newest-first.
- Activity timeline in chronological display order.
- Success status after stage and note changes, plus `toast.success("تم تحديث مرحلة الزبونة.")` and `toast.success("تمت إضافة الملاحظة.")`.
- Empty states for no upcoming, previous, notes, or activity records.

The `$id` route finds the customer in shared state. If missing, render an Arabic “لم يتم العثور على الزبونة” state with a link back to `/dashboard/customers`; otherwise render the profile.

- [ ] **Step 5: Run customer tests**

Run: `npm test -- src/features/dashboard/dashboard-customers.test.tsx src/features/dashboard/dashboard-customer-profile.test.tsx`

Expected: PASS for search, links, stage changes, note validation, note dispatch, and appointment grouping.

- [ ] **Step 6: Commit customer features**

```bash
git add src/features/dashboard/dashboard-customers.tsx src/features/dashboard/dashboard-customers.test.tsx src/features/dashboard/dashboard-customer-profile.tsx src/features/dashboard/dashboard-customer-profile.test.tsx src/routes/dashboard/customers
git commit -m "feat: add dashboard customer profiles"
```

---

### Task 7: Availability editor and simulated reminder settings

**Files:**
- Create: `src/features/dashboard/dashboard-availability.tsx`
- Create: `src/features/dashboard/dashboard-availability.test.tsx`
- Modify: `src/routes/dashboard/availability.tsx`

**Interfaces:**
- Consumes: `AvailabilitySlot[]`, `ReminderSettings`, `DashboardAction`, and `workingDayLabels`.
- Produces: `DashboardAvailability`.

- [ ] **Step 1: Write the failing interaction tests**

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDashboardState } from "./dashboard-data";
import { DashboardAvailability } from "./dashboard-availability";

afterEach(cleanup);

describe("DashboardAvailability", () => {
  it("toggles an hourly slot with an accessible label", () => {
    const dispatch = vi.fn();
    render(<DashboardAvailability availability={demoDashboardState.availability} reminderSettings={demoDashboardState.reminderSettings} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole("button", { name: "الأحد 10:00 إلى 11:00 متاح" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "availability/toggle", slotId: "sunday-10" });
  });

  it("updates both simulated reminder channels", () => {
    const dispatch = vi.fn();
    render(<DashboardAvailability availability={demoDashboardState.availability} reminderSettings={demoDashboardState.reminderSettings} dispatch={dispatch} />);
    fireEvent.click(screen.getByLabelText("تذكير الزبونة عبر WhatsApp"));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "reminders/update" }));
    expect(screen.getByText("يتم إرسال التذكير قبل الموعد بـ 24 ساعة في النسخة النهائية.")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run availability tests and verify failure**

Run: `npm test -- src/features/dashboard/dashboard-availability.test.tsx`

Expected: FAIL because the component is absent.

- [ ] **Step 3: Implement availability and reminder controls**

Render five day columns ordered for RTL reading. Every slot button shows the time in an LTR span and uses `aria-pressed={slot.enabled}`. Enabled uses violet border/background; disabled uses white/slate styling. At widths below `md`, render days as horizontally scrollable columns with a visible day label.

Render two controlled Radix `Switch` components:

- “تذكير الزبونة عبر WhatsApp”.
- “تنبيه المشرفة داخل لوحة التحكم”.

The fixed lead time is displayed as `24 ساعة` and is not editable. Every toggle dispatches `reminders/update`; show a local `role="status"` message and call `toast.success("تم حفظ الإعدادات.")` after a slot or setting changes. Keep the simulated-delivery notice visible.

Update the route to consume `useDashboard()` and pass availability, settings, and dispatch.

- [ ] **Step 4: Run availability tests**

Run: `npm test -- src/features/dashboard/dashboard-availability.test.tsx`

Expected: PASS for slot labels, dispatches, reminder controls, and simulated copy.

- [ ] **Step 5: Commit availability**

```bash
git add src/features/dashboard/dashboard-availability.tsx src/features/dashboard/dashboard-availability.test.tsx src/routes/dashboard/availability.tsx
git commit -m "feat: add dashboard availability controls"
```

---

### Task 8: Integration guard, accessibility pass, and visual verification

**Files:**
- Create: `scripts/verify-dashboard.mjs`
- Modify: dashboard files only when verification finds a concrete issue.

**Interfaces:**
- Consumes: all dashboard route and feature files from Tasks 1–7.
- Produces: repeatable verification command and final evidence that the frontend meets the approved spec.

- [ ] **Step 1: Add a failing repository guard**

```js
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "src/routes/dashboard.tsx",
  "src/routes/dashboard/index.tsx",
  "src/routes/dashboard/bookings.tsx",
  "src/routes/dashboard/customers/index.tsx",
  "src/routes/dashboard/customers/$id.tsx",
  "src/routes/dashboard/availability.tsx",
];

for (const file of required) {
  if (!existsSync(join(root, file))) throw new Error(`Missing dashboard file: ${file}`);
}

const shell = readFileSync(join(root, "src/features/dashboard/dashboard-shell.tsx"), "utf8");
for (const label of ["لوحة التحكم", "الحجوزات", "الزبائن", "المواعيد المتاحة"]) {
  if (!shell.includes(label)) throw new Error(`Missing dashboard navigation label: ${label}`);
}

const data = readFileSync(join(root, "src/features/dashboard/dashboard-data.ts"), "utf8");
if (/localStorage|sessionStorage/.test(data)) throw new Error("Dashboard demo data must remain in React memory");
```

- [ ] **Step 2: Run the guard before completing any discovered fixes**

Run: `node scripts/verify-dashboard.mjs`

Expected: PASS if Tasks 1–7 are complete; otherwise FAIL naming the missing contract.

- [ ] **Step 3: Run focused and full automated verification**

Run:

```bash
npm test -- src/features/dashboard
npm test
npm run lint
npm run build
node scripts/verify-dashboard.mjs
```

Expected: every command exits 0; Vitest reports all dashboard and existing tests passing; ESLint reports no errors; Vite/TanStack production build completes.

- [ ] **Step 4: Verify desktop behavior visually**

Run `npm run dev`, open `/dashboard` at 1440×1000, and capture evidence for:

- Right sidebar fixed and active item purple.
- Four metric cards aligned in one row.
- Day/week schedule switch works.
- Booking dialog creates a visible appointment.
- Customer profile stage and note updates appear without a refresh.
- Availability slot and reminder switches update with a success status.

- [ ] **Step 5: Verify mobile behavior visually**

At 390×844, confirm:

- Sidebar is hidden and opens through the Arabic-labeled drawer button.
- No horizontal page overflow.
- Metric cards stack, booking table becomes readable rows, and availability days remain usable.
- Every interactive target is at least 40px and keyboard focus is visible.
- Reduced-motion emulation removes decorative transitions.

- [ ] **Step 6: Commit verification support and any concrete fixes**

```bash
git add scripts/verify-dashboard.mjs src/features/dashboard src/routes/dashboard src/routes/dashboard.tsx src/routes/__root.tsx src/styles.css src/routeTree.gen.ts
git commit -m "test: verify admin dashboard experience"
```

---

## Completion Criteria

- All five dashboard URLs render through the shared RTL shell.
- Workshop and design bookings are searchable, filterable, creatable, and editable in the session store.
- Customer profiles expose phone, stage, past/upcoming appointments, notes, and activity.
- Availability and both reminder settings are locally interactive and clearly marked as simulated.
- Desktop and mobile layouts match the approved white/purple reference direction.
- Focused tests, the full suite, lint, production build, repository guard, and visual checks all pass.
