# Opening Splash Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slow the opening splash so the monogram and wordmark reveal complete in 2.8 seconds.

**Architecture:** Keep the existing `OpeningSplash` component and CSS keyframes. Adjust only the component lifecycle timers and the monogram and letter animation values, while retaining the existing 300ms fade exit and reduced-motion branch.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library.

## Global Constraints

- Preserve the existing home-page-only mount, non-interactive overlay, scroll lock, and reduced-motion timings.
- Do not add dependencies or change typography, layout, colors, or animation keyframes.
- Use the existing `var(--motion-ease-out)` easing.
- Normal-motion timing is fixed: 80ms monogram lead-in, 800ms monogram animation, 900ms letter start, 550ms per letter, 55ms letter stagger, exit at 2500ms, removal at 2800ms.

---

### Task 1: Apply the approved opening-splash timing contract

**Files:**
- Modify: `src/components/opening-splash.test.tsx:19-29`
- Modify: `src/test/motion-css.test.ts:27-45`
- Modify: `src/components/opening-splash.tsx:18-19`
- Modify: `src/styles.css:316-341`

**Interfaces:**
- Consumes: `OpeningSplash`, which exposes `data-state="active"` and `data-state="exiting"` through its root element.
- Produces: A normal-motion splash that exits at 2500ms and is removed at 2800ms, with source contracts for the approved CSS timing values.

- [ ] **Step 1: Write the failing lifecycle test**

In `src/components/opening-splash.test.tsx`, replace the first test's normal-motion timer assertions with:

```tsx
act(() => vi.advanceTimersByTime(2499));
expect(screen.getByTestId("opening-splash").dataset.state).toBe("active");

act(() => vi.advanceTimersByTime(1));
expect(screen.getByTestId("opening-splash").dataset.state).toBe("exiting");

act(() => vi.advanceTimersByTime(300));
expect(screen.queryByTestId("opening-splash")).toBeNull();
expect(document.documentElement.style.overflow).toBe("");
```

- [ ] **Step 2: Write the failing CSS source assertions**

In the `defines the opening splash and reduced-motion fallback` test in `src/test/motion-css.test.ts`, assert these exact snippets:

```ts
expect(css).toContain("animation: opening-splash-mark-in 800ms var(--motion-ease-out) 80ms");
expect(css).toContain("animation: opening-splash-letter-in 550ms");
expect(css).toContain("animation-delay: calc(900ms + var(--opening-letter-index) * 55ms)");
```

- [ ] **Step 3: Run the targeted tests to verify they fail**

Run:

```powershell
npx vitest run src/components/opening-splash.test.tsx src/test/motion-css.test.ts
```

Expected: the lifecycle test fails because the component exits at 1680ms, and the CSS source test fails because it still contains 650ms, 450ms, and 28ms values.

- [ ] **Step 4: Apply the minimal timing implementation**

In `src/components/opening-splash.tsx`, set the normal-motion timers to:

```ts
const exitAt = reducedMotion ? 250 : 2500;
const removeAt = reducedMotion ? 430 : 2800;
```

In `src/styles.css`, replace the normal-motion declarations with:

```css
animation: opening-splash-mark-in 800ms var(--motion-ease-out) 80ms forwards;
```

```css
animation: opening-splash-letter-in 550ms var(--motion-ease-out) both;
animation-delay: calc(900ms + var(--opening-letter-index) * 55ms);
```

- [ ] **Step 5: Run the targeted tests to verify they pass**

Run:

```powershell
npx vitest run src/components/opening-splash.test.tsx src/test/motion-css.test.ts
```

Expected: both test files pass with no failed tests.

- [ ] **Step 6: Run the full quality checks**

Run:

```powershell
npm run lint
npm run build
```

Expected: ESLint exits with code 0 and the Vite production build completes successfully.

- [ ] **Step 7: Commit the implementation**

```powershell
git add src/components/opening-splash.tsx src/components/opening-splash.test.tsx src/styles.css src/test/motion-css.test.ts
git commit -m "style: slow opening splash reveal"
```
