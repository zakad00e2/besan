# Besan Khalaily Opening Splash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add a once-per-tab-session splash that introduces the monogram, reveals BESAN KHALAILY letter by letter, and exits into the Arabic home page.

**Architecture:** A focused OpeningSplash component owns session visibility, timers, reduced-motion timing, and scroll locking. The home page mounts it first, while global CSS owns the editorial entrance, character stagger, and exit animations.

**Tech Stack:** React 19, TypeScript, TanStack Start, Tailwind CSS 4, Vitest, Testing Library, native CSS keyframes, sessionStorage, matchMedia.

## Global Constraints

- Show the splash only on the / home route and once per browser tab session.
- Keep the full-motion sequence at 2.8 seconds.
- Use src/assets/besan-logo.png above a live-text BESAN KHALAILY wordmark.
- Reveal characters from left to right.
- Keep the overlay decorative, non-interactive, and focus-free.
- Lock scroll while active and restore its prior value on completion or unmount.
- Under prefers-reduced-motion: reduce, remove the stagger and use a 180ms fade.
- Preserve unrelated working-tree changes and published Git history.

---

## File Structure

- Create src/components/opening-splash.tsx for lifecycle and markup.
- Create src/components/opening-splash.test.tsx for lifecycle tests.
- Modify src/routes/index.tsx to mount the splash on the home page only.
- Modify src/routes/-index.motion.test.tsx for route integration coverage.
- Modify src/styles.css for layout and motion.
- Modify src/test/motion-css.test.ts for the CSS contract.

### Task 1: Build the tested splash lifecycle

**Files:**
- Create: src/components/opening-splash.test.tsx
- Create: src/components/opening-splash.tsx

**Interfaces:**
- Consumes: the existing transparent monogram at src/assets/besan-logo.png.
- Produces: OpeningSplash and OPENING_SPLASH_STORAGE_KEY.

- [ ] **Step 1: Write the failing lifecycle tests**

Create src/components/opening-splash.test.tsx:

~~~tsx
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OPENING_SPLASH_STORAGE_KEY, OpeningSplash } from "./opening-splash";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  document.documentElement.style.overflow = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("OpeningSplash", () => {
  it("runs once, exits, and records completion", () => {
    vi.useFakeTimers();
    render(<OpeningSplash />);

    expect(screen.getByTestId("opening-splash").dataset.state).toBe("active");
    expect(screen.getByText("BESAN KHALAILY")).toBeTruthy();
    expect(document.documentElement.style.overflow).toBe("hidden");

    act(() => vi.advanceTimersByTime(2200));
    expect(screen.getByTestId("opening-splash").dataset.state).toBe("exiting");

    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByTestId("opening-splash")).toBeNull();
    expect(sessionStorage.getItem(OPENING_SPLASH_STORAGE_KEY)).toBe("complete");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("skips after completion in the current tab", () => {
    sessionStorage.setItem(OPENING_SPLASH_STORAGE_KEY, "complete");
    render(<OpeningSplash />);
    expect(screen.queryByTestId("opening-splash")).toBeNull();
  });

  it("uses short timings when reduced motion is requested", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<OpeningSplash />);

    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByTestId("opening-splash").dataset.state).toBe("exiting");

    act(() => vi.advanceTimersByTime(180));
    expect(screen.queryByTestId("opening-splash")).toBeNull();
  });

  it("restores prior scroll state when unmounted early", () => {
    vi.useFakeTimers();
    document.documentElement.style.overflow = "clip";
    const { unmount } = render(<OpeningSplash />);
    expect(document.documentElement.style.overflow).toBe("hidden");

    unmount();
    expect(document.documentElement.style.overflow).toBe("clip");
  });
});
~~~

- [ ] **Step 2: Run the test and verify RED**

Run:

~~~powershell
npx vitest run src/components/opening-splash.test.tsx
~~~

Expected: FAIL because the component file does not exist.

- [ ] **Step 3: Implement the lifecycle and markup**

Create src/components/opening-splash.tsx:

~~~tsx
import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import monogram from "@/assets/besan-logo.png";

export const OPENING_SPLASH_STORAGE_KEY = "besan-opening-splash:v1";

const BRAND_NAME = "BESAN KHALAILY";
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type SplashState = "active" | "exiting" | "hidden";

function hasCompletedSplash() {
  try {
    return window.sessionStorage.getItem(OPENING_SPLASH_STORAGE_KEY) === "complete";
  } catch {
    return false;
  }
}

function recordSplashCompletion() {
  try {
    window.sessionStorage.setItem(OPENING_SPLASH_STORAGE_KEY, "complete");
  } catch {
    // Storage may be blocked; revealing the page still takes priority.
  }
}

export function OpeningSplash() {
  const [state, setState] = useState<SplashState>("active");

  useClientLayoutEffect(() => {
    if (hasCompletedSplash()) {
      setState("hidden");
      return;
    }

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const exitAt = reducedMotion ? 250 : 2200;
    const removeAt = reducedMotion ? 430 : 2800;

    root.style.overflow = "hidden";
    const exitTimer = window.setTimeout(() => setState("exiting"), exitAt);
    const removeTimer = window.setTimeout(() => {
      recordSplashCompletion();
      root.style.overflow = previousOverflow;
      setState("hidden");
    }, removeAt);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
      root.style.overflow = previousOverflow;
    };
  }, []);

  if (state === "hidden") return null;

  return (
    <div
      data-testid="opening-splash"
      data-state={state}
      aria-hidden="true"
      className="opening-splash"
    >
      <div className="opening-splash__lockup">
        <img
          src={monogram}
          alt=""
          width={382}
          height={263}
          className="opening-splash__monogram"
        />
        <p className="opening-splash__wordmark">
          <span className="sr-only">{BRAND_NAME}</span>
          <span aria-hidden="true">
            {Array.from(BRAND_NAME).map((character, index) => (
              <span
                key={character + "-" + index}
                className="opening-splash__letter"
                style={{ "--opening-letter-index": index } as CSSProperties}
              >
                {character === " " ? "\u00a0" : character}
              </span>
            ))}
          </span>
        </p>
      </div>
    </div>
  );
}
~~~

- [ ] **Step 4: Run the component tests and verify GREEN**

Run:

~~~powershell
npx vitest run src/components/opening-splash.test.tsx
~~~

Expected: 4 tests PASS.

- [ ] **Step 5: Commit the lifecycle**

~~~powershell
git add src/components/opening-splash.tsx src/components/opening-splash.test.tsx
git commit -m "feat: add opening splash lifecycle"
~~~

### Task 2: Add editorial motion and home integration

**Files:**
- Modify: src/routes/index.tsx
- Modify: src/routes/-index.motion.test.tsx
- Modify: src/styles.css
- Modify: src/test/motion-css.test.ts

**Interfaces:**
- Consumes: OpeningSplash from @/components/opening-splash.
- Produces: home-only mounting and the opening-splash global CSS contract.

- [ ] **Step 1: Write failing integration and CSS tests**

In src/routes/-index.motion.test.tsx, import the storage key, clear sessionStorage in afterEach, and add:

~~~tsx
import { OPENING_SPLASH_STORAGE_KEY } from "@/components/opening-splash";

// Inside the existing afterEach:
sessionStorage.clear();

it("mounts the opening splash as the first home-page layer", () => {
  render(<HomePage locale="ar" />);
  const publicSite = screen.getByTestId("public-site");
  expect(publicSite.firstElementChild?.getAttribute("data-testid")).toBe("opening-splash");
  expect(sessionStorage.getItem(OPENING_SPLASH_STORAGE_KEY)).toBeNull();
});
~~~

In src/test/motion-css.test.ts, add:

~~~ts
it("defines the opening splash and reduced-motion fallback", () => {
  expect(css).toContain('.opening-splash[data-state="exiting"]');
  expect(css).toContain("animation-delay: calc(700ms + var(--opening-letter-index) * 55ms)");
  expect(css).toContain("@keyframes opening-splash-exit");
  expect(css).toContain(".opening-splash__letter");
  expect(css).toContain("animation: none !important");
});
~~~

- [ ] **Step 2: Run focused tests and verify RED**

~~~powershell
npx vitest run src/routes/-index.motion.test.tsx src/test/motion-css.test.ts
~~~

Expected: FAIL because the route does not mount the component and splash CSS is absent.

- [ ] **Step 3: Mount the splash on the home page**

Import OpeningSplash in src/routes/index.tsx:

~~~tsx
import { OpeningSplash } from "@/components/opening-splash";
~~~

Render it before the existing page div:

~~~tsx
<PublicSite locale={locale}>
  <OpeningSplash />
  <div className="min-h-screen bg-background text-foreground">
    <SiteNav />
    <Hero />
    <Testimonials />
    <HowICanHelp />
    <SiteFooter />
  </div>
</PublicSite>
~~~

- [ ] **Step 4: Add layout and motion styles**

Insert before the existing reduced-motion media query in src/styles.css:

~~~css
.opening-splash {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: max(2rem, env(safe-area-inset-top)) 1.5rem max(2rem, env(safe-area-inset-bottom));
  background: var(--color-background);
  color: var(--color-foreground);
  direction: ltr;
  pointer-events: none;
  isolation: isolate;
  will-change: transform, opacity;
}

.opening-splash[data-state="exiting"] {
  animation: opening-splash-exit 600ms var(--motion-ease-move) both;
}

.opening-splash__lockup {
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateY(-1.5vh);
}

.opening-splash__monogram {
  width: clamp(8.5rem, 18vw, 13rem);
  height: auto;
  opacity: 0;
  transform: translateY(0.75rem) scale(0.985);
  animation: opening-splash-mark-in 700ms var(--motion-ease-out) 120ms forwards;
}

.opening-splash__wordmark {
  margin-top: clamp(1.25rem, 3vh, 2rem);
  padding-left: 0.28em;
  white-space: nowrap;
  font-family: var(--font-serif);
  font-size: clamp(1rem, 2.4vw, 1.5rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.28em;
}

.opening-splash__letter {
  display: inline-block;
  opacity: 0;
  filter: blur(0.2rem);
  transform: translateY(0.5rem);
  animation: opening-splash-letter-in 420ms var(--motion-ease-out) both;
  animation-delay: calc(700ms + var(--opening-letter-index) * 55ms);
}

@keyframes opening-splash-mark-in {
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes opening-splash-letter-in {
  to { opacity: 1; filter: blur(0); transform: translateY(0); }
}

@keyframes opening-splash-exit {
  to { opacity: 0.98; transform: translateY(-100%); }
}
~~~

Inside the existing reduced-motion block add:

~~~css
.opening-splash[data-state="exiting"] {
  animation: motion-fade-out 180ms linear both;
}

.opening-splash__monogram,
.opening-splash__letter {
  animation: none !important;
  opacity: 1;
  filter: none;
  transform: none;
}
~~~

- [ ] **Step 5: Run focused tests and verify GREEN**

~~~powershell
npx vitest run src/components/opening-splash.test.tsx src/routes/-index.motion.test.tsx src/test/motion-css.test.ts
~~~

Expected: all focused tests PASS.

- [ ] **Step 6: Commit the visual integration**

~~~powershell
git add src/routes/index.tsx src/routes/-index.motion.test.tsx src/styles.css src/test/motion-css.test.ts
git commit -m "feat: animate Besan opening splash"
~~~

### Task 3: Verify the complete experience

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: the completed splash and home integration.
- Produces: test, build, and visual evidence.

- [ ] **Step 1: Run the full suite**

~~~powershell
npm test
~~~

Expected: all Vitest suites PASS without unhandled errors.

- [ ] **Step 2: Run the production build**

~~~powershell
npm run build
~~~

Expected: exit code 0 with client and server bundles generated.

- [ ] **Step 3: Verify desktop, mobile, session, and reduced motion**

Start the dev server and inspect / in a fresh tab:

- Desktop: centered lockup, left-to-right letters, no wrap or page flash, clean upward exit.
- Mobile: balanced safe areas, fitted monogram, single-line name, smooth reveal.
- Session: refresh the same tab after completion; the splash does not replay.
- Reduced motion: complete lockup appears without stagger, then fades in 180ms.
- Scroll: document scrolling returns after completion and after early unmount.

- [ ] **Step 4: Inspect the feature diff**

~~~powershell
git status --short
git diff --check
git diff -- src/components/opening-splash.tsx src/components/opening-splash.test.tsx src/routes/index.tsx src/routes/-index.motion.test.tsx src/styles.css src/test/motion-css.test.ts
~~~

Expected: the feature touches only the planned files, diff checks are clean, and pre-existing unrelated changes remain untouched.

