# Time-aware Dashboard Greeting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's fixed greeting with a greeting that matches the local time.

**Architecture:** Keep the time-range decision as a pure helper inside `dashboard-overview.tsx`. The component already accepts `now`, so it will supply that value to the helper and tests can exercise each time range deterministically.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library.

## Global Constraints

- Keep the existing greeting layout unchanged.
- Use the dashboard's `now` value; do not add a timer or new state.
- Keep greeting copy in English: morning, afternoon, evening, and night.

---

### Task 1: Render a time-aware greeting

**Files:**
- Modify: `src/features/dashboard/dashboard-overview.tsx:26-49, 201-203`
- Test: `src/features/dashboard/dashboard-overview.test.tsx`

**Interfaces:**
- Produces: `getDashboardGreeting(now: Date): string`
- Consumes: `DashboardOverview`'s existing `now: Date` prop.

- [ ] **Step 1: Write the failing test**

```tsx
expect(getDashboardGreeting(new Date("2026-07-17T05:00:00"))).toBe("Good morning Besan ☀️");
expect(getDashboardGreeting(new Date("2026-07-17T12:00:00"))).toBe("Good afternoon Besan ☀️");
expect(getDashboardGreeting(new Date("2026-07-17T17:00:00"))).toBe("Good evening Besan ☀️");
expect(getDashboardGreeting(new Date("2026-07-17T22:00:00"))).toBe("Good night Besan 🌙");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: FAIL because `getDashboardGreeting` is not exported.

- [ ] **Step 3: Write the minimal implementation**

```tsx
export function getDashboardGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 5 || hour >= 22) return "Good night Besan 🌙";
  if (hour < 12) return "Good morning Besan ☀️";
  if (hour < 17) return "Good afternoon Besan ☀️";
  return "Good evening Besan ☀️";
}
```

Render `{getDashboardGreeting(now)}` in the existing greeting paragraph.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/features/dashboard/dashboard-overview.test.tsx`

Expected: PASS with all overview tests passing.

- [ ] **Step 5: Verify formatting and production build**

Run: `npx prettier --check src/features/dashboard/dashboard-overview.tsx src/features/dashboard/dashboard-overview.test.tsx && npm run build`

Expected: formatting check and production build exit successfully.
