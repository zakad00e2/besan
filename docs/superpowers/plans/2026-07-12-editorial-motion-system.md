# Editorial Motion System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a cohesive, accessible motion system across the public site, booking flows, shared portaled surfaces, and dashboard while preserving the existing editorial identity.

**Architecture:** Define one CSS motion-token layer, then consume it through narrowly scoped Tailwind classes and a few semantic motion classes. Keep GSAP only for the Book Call editorial entrance, use existing Radix/tw-animate primitives for dialogs and sheets, and add no dependency. Component and source-contract tests lock down behavior before each production edit.

**Tech Stack:** React 19, TypeScript 5.8, TanStack Start, Tailwind CSS 4, GSAP 3.15, Radix UI, Vitest 4, Testing Library

## Global Constraints

- Preserve the quiet editorial fashion identity; do not imitate Apple's visual styling.
- Do not change typography, colors, spacing, copy, information architecture, persistence, validation, authentication, or data flow.
- Do not add an animation dependency.
- Keep Recharts animation disabled.
- Editorial entrance durations are 600–800ms; use 700ms by default and 600ms for compact entrances.
- Interface durations are 120ms press, 160ms color/hover, 180ms small state, 220ms accordion/content reveal, and 240ms modal/sheet.
- Use `cubic-bezier(0.23, 1, 0.32, 1)` for entrance, `cubic-bezier(0.77, 0, 0.175, 1)` for on-screen movement, and `cubic-bezier(0.32, 0.72, 0, 1)` for sheets.
- Reduced motion removes spatial movement but preserves brief opacity and color feedback.
- Gate decorative hover movement behind `@media (hover: hover) and (pointer: fine)`.
- Preserve all pre-existing uncommitted user changes. Do not stage or commit source files while the worktree remains dirty; use verification checkpoints instead.

---

## File Map

- Create `src/test/motion-css.test.ts`: CSS token and accessible fallback contracts.
- Create `src/components/ui/motion-primitives.test.tsx`: live Dialog and Sheet motion contracts.
- Create `src/components/site-shell.test.tsx`: Reveal transition behavior.
- Create `src/routes/index.motion.test.tsx`: testimonial and services behavior.
- Create `src/test/motion-source-contracts.test.ts`: scoped source contracts for page-level Tailwind hooks.
- Modify `src/styles.css`: shared motion tokens, semantic classes, pointer gating, and reduced-motion fallbacks.
- Modify `src/components/site-shell.tsx`: scoped Reveal and press feedback.
- Modify `src/components/ui/dialog.tsx`: portaled motion hooks and 240ms timing.
- Modify `src/components/ui/sheet.tsx`: portaled motion hooks, sheet curve, and 240ms timing.
- Modify `src/routes/index.tsx`: testimonial transition, accordion continuity, image hover, and CTA feedback.
- Modify `src/routes/workshops.tsx`: scoped image/overlay hover and CTA feedback.
- Modify `src/routes/book-call.tsx`: single GSAP entrance, availability reveal, scoped controls, and press feedback.
- Modify `src/features/workshop-booking/workshop-booking-dialog.tsx`: success-state transition and press feedback.
- Modify `src/features/dashboard/dashboard-ui.tsx`: scoped button/card transitions.
- Modify `src/features/dashboard/dashboard-shell.tsx`: scoped navigation transition and mobile-sheet contract.
- Modify `src/features/dashboard/dashboard-overview.tsx`: scoped card transition.

---

### Task 1: Shared motion tokens and accessible semantic classes

**Files:**
- Create: `src/test/motion-css.test.ts`
- Modify: `src/styles.css:8-39,75-127`

**Interfaces:**
- Produces: CSS variables `--motion-duration-press`, `--motion-duration-color`, `--motion-duration-state`, `--motion-duration-reveal`, `--motion-duration-surface`, `--motion-duration-editorial`, `--motion-ease-out`, `--motion-ease-move`, and `--motion-ease-sheet`.
- Produces: semantic classes `.motion-press`, `.motion-state-enter`, `.editorial-image`, and `.editorial-overlay`.

- [ ] **Step 1: Write the failing CSS contract tests**

```ts
// src/test/motion-css.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("motion CSS", () => {
  it("defines the approved editorial and interface motion tokens", () => {
    expect(css).toContain("--motion-duration-press: 120ms");
    expect(css).toContain("--motion-duration-surface: 240ms");
    expect(css).toContain("--motion-duration-editorial: 700ms");
    expect(css).toContain("--motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1)");
    expect(css).toContain("--motion-ease-sheet: cubic-bezier(0.32, 0.72, 0, 1)");
  });

  it("gates decorative image movement to fine pointers", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain(".editorial-image:hover");
  });

  it("provides opacity-only reduced-motion fallbacks for portaled surfaces", () => {
    expect(css).toContain('[data-motion-surface="dialog"]');
    expect(css).toContain('[data-motion-surface="sheet"]');
    expect(css).toContain("animation-name: motion-fade-in");
    expect(css).not.toContain(".dashboard-app *::after");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/test/motion-css.test.ts`

Expected: FAIL because the motion variables and semantic classes do not exist and the old dashboard blanket rule still exists.

- [ ] **Step 3: Add the minimal shared CSS implementation**

Add the concrete values to `:root`. Tailwind arbitrary-value consumers can reference these CSS variables directly, so do not duplicate them inside `@theme inline`:

```css
--motion-duration-press: 120ms;
--motion-duration-color: 160ms;
--motion-duration-state: 180ms;
--motion-duration-reveal: 220ms;
--motion-duration-surface: 240ms;
--motion-duration-editorial: 700ms;
--motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--motion-ease-move: cubic-bezier(0.77, 0, 0.175, 1);
--motion-ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);
```

Add semantic classes after the dashboard styles:

```css
.motion-press {
  transition-property: transform;
  transition-duration: var(--motion-duration-press);
  transition-timing-function: var(--motion-ease-out);
}

.motion-press:active {
  transform: scale(0.97);
}

.motion-state-enter {
  animation: motion-state-enter var(--motion-duration-reveal) var(--motion-ease-out) both;
}

.editorial-image,
.editorial-overlay {
  transition-duration: var(--motion-duration-surface);
  transition-timing-function: var(--motion-ease-out);
}

.editorial-image {
  transition-property: filter, transform;
}

.editorial-overlay {
  transition-property: opacity, background-color;
}

@media (hover: hover) and (pointer: fine) {
  .group:hover .editorial-image,
  .editorial-image:hover {
    filter: grayscale(0);
    transform: scale(1.015);
  }
}

@keyframes motion-state-enter {
  from { opacity: 0; transform: translateY(0.5rem); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes motion-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes motion-fade-out { from { opacity: 1; } to { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .motion-press:active { transform: none; }
  .motion-state-enter { animation-name: motion-fade-in; animation-duration: 180ms; }
  .editorial-image { transform: none !important; }

  [data-motion-surface="dialog"],
  [data-motion-surface="sheet"] {
    animation-duration: 180ms !important;
  }

  [data-motion-surface][data-state="open"] { animation-name: motion-fade-in !important; }
  [data-motion-surface][data-state="closed"] { animation-name: motion-fade-out !important; }
}
```

The fade keyframes must not declare `transform`; this preserves the dialog's base `translate(-50%, -50%)` centering while replacing the tw-animate slide/zoom keyframe.

Remove the blanket `.dashboard-app *`, `*::before`, and `*::after` duration override at the bottom of the file.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- src/test/motion-css.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Checkpoint without staging user work**

Run: `git diff --check -- src/styles.css src/test/motion-css.test.ts`

Expected: no whitespace errors. Do not commit while pre-existing user changes remain in `src/styles.css`.

---

### Task 2: Portaled Dialog and Sheet motion

**Files:**
- Create: `src/components/ui/motion-primitives.test.tsx`
- Modify: `src/components/ui/dialog.tsx:13-48`
- Modify: `src/components/ui/sheet.tsx:15-61`

**Interfaces:**
- Consumes: Task 1 motion variables and `[data-motion-surface]` reduced-motion CSS.
- Produces: `data-motion-surface="dialog"` and `data-motion-surface="sheet"` on both overlay and content.

- [ ] **Step 1: Write failing live-component tests**

```tsx
// src/components/ui/motion-primitives.test.tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

afterEach(cleanup);

describe("portaled motion surfaces", () => {
  it("marks dialog content for the global reduced-motion fallback", () => {
    render(<Dialog open><DialogContent><DialogTitle>Dialog</DialogTitle></DialogContent></Dialog>);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("data-motion-surface")).toBe("dialog");
    expect(dialog.className).toContain("duration-[var(--motion-duration-surface)]");
  });

  it("uses the approved sheet timing and curve", () => {
    render(<Sheet open><SheetContent><SheetTitle>Menu</SheetTitle></SheetContent></Sheet>);
    const sheet = screen.getByRole("dialog");
    expect(sheet.getAttribute("data-motion-surface")).toBe("sheet");
    expect(sheet.className).toContain("duration-[var(--motion-duration-surface)]");
    expect(sheet.className).toContain("ease-[var(--motion-ease-sheet)]");
    expect(sheet.className).not.toContain("duration-500");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/components/ui/motion-primitives.test.tsx`

Expected: FAIL because the data attributes and token-backed timing classes are absent.

- [ ] **Step 3: Implement token-backed surface motion**

Apply `data-motion-surface="dialog"` to `DialogOverlay` and `DialogPrimitive.Content`. Replace `duration-200` with `duration-[var(--motion-duration-surface)]` and add `ease-[var(--motion-ease-out)]`.

Apply `data-motion-surface="sheet"` to `SheetOverlay` and `SheetPrimitive.Content`. Change the base variant to:

```ts
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg duration-[var(--motion-duration-surface)] ease-[var(--motion-ease-sheet)] data-[state=open]:animate-in data-[state=closed]:animate-out",
  // keep existing side variants and defaults unchanged
);
```

Do not change the symmetric side-specific slide directions.

- [ ] **Step 4: Run targeted primitive tests**

Run: `npm test -- src/components/ui/motion-primitives.test.tsx src/features/dashboard/dashboard-shell.test.tsx src/features/workshop-booking/workshop-booking-dialog.test.tsx`

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `git diff --check -- src/components/ui/dialog.tsx src/components/ui/sheet.tsx src/components/ui/motion-primitives.test.tsx`

Expected: no whitespace errors.

---

### Task 3: One editorial entrance system

**Files:**
- Create: `src/components/site-shell.test.tsx`
- Create: `src/test/motion-source-contracts.test.ts`
- Modify: `src/components/site-shell.tsx:5-51,81-100`
- Modify: `src/routes/book-call.tsx:3-5,67-102,149-174,398-399`

**Interfaces:**
- Consumes: Task 1 editorial duration and entrance curve.
- Produces: Reveal scoped to opacity/translation and Book Call using GSAP without nested Reveal.

- [ ] **Step 1: Write failing Reveal and source-contract tests**

```tsx
// src/components/site-shell.test.tsx
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Reveal } from "./site-shell";

afterEach(cleanup);

describe("Reveal", () => {
  it("transitions only opacity and translation with the editorial timing", async () => {
    const { container } = render(<Reveal>Copy</Reveal>);
    await act(async () => undefined);
    const reveal = container.firstElementChild as HTMLElement;
    expect(reveal.className).toContain("transition-[opacity,translate]");
    expect(reveal.className).toContain("duration-[var(--motion-duration-editorial)]");
    expect(reveal.className).not.toContain("transition-all");
    expect(reveal.className).not.toContain("will-change-transform");
  });
});
```

Append to `src/test/motion-source-contracts.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("page motion contracts", () => {
  it("uses GSAP as the only Book Call entrance system", () => {
    const source = read("../routes/book-call.tsx");
    expect(source).toContain('import gsap from "gsap"');
    expect(source).not.toContain("<Reveal");
    expect(source).not.toContain("Reveal, SiteFooter");
    expect(source).toContain("stagger: 0.08");
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/components/site-shell.test.tsx src/test/motion-source-contracts.test.ts`

Expected: FAIL on current `transition-all`, `will-change-transform`, nested Reveal, and 0.12 stagger.

- [ ] **Step 3: Scope Reveal and remove the nested Book Call entrance**

Change Reveal's base class to:

```tsx
className={`transition-[opacity,translate] duration-[var(--motion-duration-editorial)] ease-[var(--motion-ease-out)] motion-reduce:transition-opacity ${
  visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
} ${className}`}
```

In `book-call.tsx`, remove `Reveal` from the import, replace the two `<Reveal>` wrappers with `<div>`, remove their `delay` prop, and preserve all layout class names. Tighten GSAP to `duration: 0.7` for copy, `duration: 0.6` for panels/lines, and `stagger: 0.08` for both groups.

Add `motion-press` to the site-shell Book A Call link and preserve its existing color transition.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- src/components/site-shell.test.tsx src/test/motion-source-contracts.test.ts`

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `git diff --check -- src/components/site-shell.tsx src/components/site-shell.test.tsx src/routes/book-call.tsx src/test/motion-source-contracts.test.ts`

Expected: no whitespace errors.

---

### Task 4: Homepage testimonial, accordion, images, and CTAs

**Files:**
- Create: `src/routes/index.motion.test.tsx`
- Modify: `src/routes/index.tsx:2-5,64-108,114-205`

**Interfaces:**
- Consumes: `.motion-press`, `.editorial-image`, and shared timing variables.
- Produces: exported `Testimonials` and `HowICanHelp` components for focused behavior tests.

- [ ] **Step 1: Write failing interaction tests**

```tsx
// src/routes/index.motion.test.tsx
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HowICanHelp, Testimonials } from "./index";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("homepage motion", () => {
  it("retargets rapid testimonial navigation to the latest quote", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    render(<Testimonials />);
    const next = screen.getByRole("button", { name: "Next" });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByTestId("testimonial-copy").className).toContain("opacity-0");
    act(() => vi.advanceTimersByTime(90));
    expect(screen.getByText(/A rare designer who listens/)).toBeTruthy();
    expect(screen.getByTestId("testimonial-copy").className).toContain("opacity-100");
  });

  it("uses one continuous accordion indicator and scoped panel transition", () => {
    render(<HowICanHelp />);
    fireEvent.click(screen.getByRole("button", { name: "Bridal & Evening Wear" }));
    const indicator = screen.getByTestId("service-indicator-1");
    const panel = screen.getByTestId("service-panel-1");
    expect(indicator.getAttribute("data-state")).toBe("open");
    expect(panel.className).toContain("transition-[grid-template-rows,padding-bottom]");
    expect(panel.className).not.toContain("transition-all");
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/routes/index.motion.test.tsx`

Expected: FAIL because the components are not exported and the transition hooks do not exist.

- [ ] **Step 3: Implement interruptible testimonial retargeting**

Export `Testimonials` and `HowICanHelp`. In `Testimonials`, add `visible`, `pendingIndex`, and `swapTimer` state/refs. Use this exact navigation behavior:

```tsx
const [visible, setVisible] = useState(true);
const pendingIndex = useRef(0);
const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => () => {
  if (swapTimer.current) clearTimeout(swapTimer.current);
}, []);

const move = (delta: number) => {
  pendingIndex.current = (pendingIndex.current + delta + TESTIMONIALS.length) % TESTIMONIALS.length;
  setVisible(false);
  if (swapTimer.current) clearTimeout(swapTimer.current);
  swapTimer.current = setTimeout(() => {
    setI(pendingIndex.current);
    requestAnimationFrame(() => setVisible(true));
  }, 90);
};
```

Replace `prev`/`next` with `move(-1)`/`move(1)`. Wrap quote and author in one `data-testid="testimonial-copy"` container using:

```tsx
className={`transition-[opacity,translate] duration-[var(--motion-duration-state)] ease-[var(--motion-ease-out)] motion-reduce:translate-y-0 ${
  visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
}`}
```

Add `motion-press` to both arrow buttons.

- [ ] **Step 4: Implement continuous accordion and scoped imagery**

Replace the Plus/Minus branch with one two-line indicator:

```tsx
<span data-testid={`service-indicator-${idx}`} data-state={isOpen ? "open" : "closed"} className="relative h-5 w-5 shrink-0" aria-hidden="true">
  <span className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-current" />
  <span className={`absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 bg-current transition-transform duration-[var(--motion-duration-state)] ease-[var(--motion-ease-out)] motion-reduce:transition-none ${isOpen ? "scale-y-0" : "scale-y-100"}`} />
</span>
```

Add `data-testid={`service-panel-${idx}`}` and replace `transition-all duration-300` with `transition-[grid-template-rows,padding-bottom] duration-[var(--motion-duration-reveal)] ease-[var(--motion-ease-move)] motion-reduce:transition-none`.

Replace the hero image's transition classes with `editorial-image grayscale`. Add `motion-press` to homepage CTA links. Remove unused `Minus` and `Plus` imports.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test -- src/routes/index.motion.test.tsx src/components/site-shell.test.tsx`

Expected: PASS.

- [ ] **Step 6: Checkpoint**

Run: `git diff --check -- src/routes/index.tsx src/routes/index.motion.test.tsx`

Expected: no whitespace errors.

---

### Task 5: Workshop imagery and success completion

**Files:**
- Modify: `src/routes/workshops.tsx:128-150,242-252,310-320`
- Modify: `src/features/workshop-booking/workshop-booking-dialog.tsx:92-115,194-200`
- Modify: `src/features/workshop-booking/workshop-booking-dialog.test.tsx`
- Modify: `src/test/motion-source-contracts.test.ts`

**Interfaces:**
- Consumes: `.editorial-image`, `.editorial-overlay`, `.motion-press`, and `.motion-state-enter`.
- Produces: `data-motion-state="workshop-success"` on the persisted success state.

- [ ] **Step 1: Add failing workshop contracts**

Append to the source-contract suite:

```ts
it("uses pointer-gated editorial image hooks on every workshop card", () => {
  const source = read("../routes/workshops.tsx");
  expect(source.match(/editorial-image/g)?.length).toBe(3);
  expect(source).not.toContain("duration-500 group-hover:grayscale-0");
});
```

Extend the existing persistence-success test:

```tsx
const status = await screen.findByRole("status");
const success = status.closest('[data-motion-state="workshop-success"]');
expect(success).toBeTruthy();
expect(success?.className).toContain("motion-state-enter");
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/test/motion-source-contracts.test.ts src/features/workshop-booking/workshop-booking-dialog.test.tsx`

Expected: FAIL because the image and success hooks do not exist.

- [ ] **Step 3: Implement workshop motion hooks**

For all three workshop images, replace `transition duration-500 group-hover:grayscale-0` with `editorial-image grayscale`. Change the third overlay to `editorial-overlay` while preserving its current base and hover colors. Add `motion-press` to `BookingButton`.

Change the success wrapper to:

```tsx
<div data-motion-state="workshop-success" className="motion-state-enter flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
```

Add `motion-press` to the Close and Send buttons without changing their existing opacity feedback.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- src/test/motion-source-contracts.test.ts src/features/workshop-booking/workshop-booking-dialog.test.tsx`

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `git diff --check -- src/routes/workshops.tsx src/features/workshop-booking/workshop-booking-dialog.tsx src/features/workshop-booking/workshop-booking-dialog.test.tsx src/test/motion-source-contracts.test.ts`

Expected: no whitespace errors.

---

### Task 6: Book Call state reveals and dashboard transition scope

**Files:**
- Modify: `src/routes/book-call.tsx:183-191,252-279,289-316,381-396`
- Modify: `src/features/dashboard/dashboard-ui.tsx:6-28,61-64`
- Modify: `src/features/dashboard/dashboard-shell.tsx:74-88`
- Modify: `src/features/dashboard/dashboard-overview.tsx:76-79`
- Modify: `src/test/motion-source-contracts.test.ts`
- Create: `src/features/dashboard/dashboard-ui.test.ts`

**Interfaces:**
- Consumes: motion variables and `.motion-state-enter`/`.motion-press`.
- Produces: `data-motion-state="availability"` on desktop and mobile time grids.

- [ ] **Step 1: Write failing Book Call and dashboard contracts**

Append to `motion-source-contracts.test.ts`:

```ts
it("reveals both availability grids without broad transitions", () => {
  const source = read("../routes/book-call.tsx");
  expect(source.match(/data-motion-state="availability"/g)?.length).toBe(2);
  expect(source).not.toContain("transition-all duration-200");
});
```

Create the dashboard class contract:

```ts
// src/features/dashboard/dashboard-ui.test.ts
import { describe, expect, it } from "vitest";
import {
  dashboardIconButtonClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "./dashboard-ui";

describe("dashboard motion classes", () => {
  it.each([
    dashboardPrimaryButtonClassName,
    dashboardSecondaryButtonClassName,
    dashboardIconButtonClassName,
  ])("scopes high-frequency button transitions", (className) => {
    expect(className).not.toContain("transition-all");
    expect(className).toContain("motion-press");
    expect(className).toContain("duration-[var(--motion-duration-color)]");
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/test/motion-source-contracts.test.ts src/features/dashboard/dashboard-ui.test.ts`

Expected: FAIL on missing availability hooks and existing `transition-all` classes.

- [ ] **Step 3: Implement Book Call state and control motion**

Add `data-motion-state="availability"` and `motion-state-enter` to both rendered `availableTimes` grid containers. Keep the empty instructional state static.

Replace each appointment/time `transition-all duration-200` with:

```txt
transition-[color,background-color,border-color,transform] duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)] motion-press
```

Add `motion-press` to Back and Confirm Booking.

- [ ] **Step 4: Scope dashboard transitions**

For the three exported dashboard button class constants, replace `transition-all duration-200` with:

```txt
motion-press transition-[color,background-color,box-shadow,transform] duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)]
```

Replace MetricCard and DashboardOverview card `transition-all duration-200` with `transition-[border-color,box-shadow] duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)]`.

Replace dashboard navigation's `transition-all duration-200` with `transition-[color,background-color,border-color,box-shadow] duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)]`.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run: `npm test -- src/test/motion-source-contracts.test.ts src/features/dashboard/dashboard-ui.test.ts src/features/dashboard/dashboard-shell.test.tsx`

Expected: PASS.

- [ ] **Step 6: Checkpoint**

Run: `git diff --check -- src/routes/book-call.tsx src/features/dashboard/dashboard-ui.tsx src/features/dashboard/dashboard-ui.test.ts src/features/dashboard/dashboard-shell.tsx src/features/dashboard/dashboard-overview.tsx src/test/motion-source-contracts.test.ts`

Expected: no whitespace errors.

---

### Task 7: Full verification and visual feel-check

**Files:**
- Verify only; no planned production edits.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified implementation evidence.

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: exit 0 with no failed tests.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit 0 with no ESLint errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit 0 and Vite production output completes.

- [ ] **Step 4: Re-run the source audit**

Run:

```powershell
rg -n 'transition-all|duration-500|duration-700|duration-\[900ms\]|animate-fade-in|group-hover:scale|group-hover:grayscale' src/components/site-shell.tsx src/routes/index.tsx src/routes/workshops.tsx src/routes/book-call.tsx src/features/dashboard src/components/ui/dialog.tsx src/components/ui/sheet.tsx
```

Expected: no audited broad/obsolete motion remains in live paths. Review every remaining match rather than deleting scaffold-only behavior blindly.

- [ ] **Step 5: Verify desktop and mobile motion in the local app**

Run: `npm run dev -- --host 127.0.0.1 --port 4173`

Check at 1280×720 and 390×844:

- `/`: editorial entrance, rapid testimonial navigation, services accordion, CTA press, and image hover.
- `/workshops`: scroll reveals, three image treatments, dialog open/close, and persisted success state.
- `/book-call`: single page entrance, day-to-time reveal, appointment/time controls, and submit states.
- `/dashboard`: mobile sheet, navigation, dialogs, cards, and button press feedback.

Expected: no input waits for animation; controls react on press; exits mirror entrances; editorial motion remains calm rather than bouncy.

- [ ] **Step 6: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce` and repeat the four routes.

Expected: no slide, scale, or vertical reveal remains; short opacity/color feedback remains; portaled dialogs and sheets fade without spatial motion.

- [ ] **Step 7: Review final diff without staging**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only the planned motion/test files plus the user's pre-existing dirty files are present. Do not commit or stage mixed user work without explicit authorization.

---

## Recommended Execution Order

1. Motion tokens and accessibility.
2. Portaled primitives.
3. Reveal and Book Call entrance ownership.
4. Homepage interactions.
5. Workshops and success state.
6. Book Call state reveals and dashboard controls.
7. Full automated and visual verification.

Tasks 2–6 depend on Task 1. Task 3 must precede Task 6 because both edit `src/routes/book-call.tsx`. Tasks 4 and 5 can run independently after Task 1, but they should not edit shared files concurrently.
