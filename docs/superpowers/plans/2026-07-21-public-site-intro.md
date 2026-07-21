# Public Site Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a warm, full-screen Besan Khalaily brand intro that reveals the monogram and `BESAN KHALAILY` letter by letter once per browser session before the public site appears.

**Architecture:** A focused `PublicSiteIntro` component owns session detection, animation phases, timers, reduced-motion timing, and scroll cleanup. `PublicSiteBoundary` mounts it beside existing public content, which keeps the feature out of dashboard/auth routes. Existing `src/assets/besan-logo.png` supplies the high-resolution transparent monogram; the wordmark remains live text so each letter can transition independently.

**Tech Stack:** React 19, TypeScript, TanStack Start, Tailwind CSS v4, CSS transitions, Vitest, Testing Library, browser `sessionStorage` and `matchMedia` APIs.

## Global Constraints

- Show the intro on public-site routes only; do not mount it in dashboard, authentication, error, or application-only routes.
- Show the intro once per browser session by storing `"1"` under `besan.public-intro.seen` in `sessionStorage`.
- Use the existing `src/assets/besan-logo.png`; do not duplicate the temporary clipboard image.
- Render `BESAN KHALAILY` as live text and reveal its 13 non-space letters from left to right.
- Keep the normal-motion sequence at 2,000 milliseconds total: enter immediately, begin exit at 1,800 milliseconds, and unmount at 2,000 milliseconds.
- Under `prefers-reduced-motion: reduce`, remove spatial/staggered transitions, begin exit at 50 milliseconds, and unmount at 150 milliseconds.
- Do not add a motion library or delay the underlying page's rendering or data requests.
- Always clean timers and the document scroll-lock class on unmount.

---

## File Structure

| File                                                 | Responsibility                                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/features/site-intro/public-site-intro.tsx`      | Session gate, animation phases, reduced-motion timing, scroll lock, accessible logo/wordmark markup.                  |
| `src/features/site-intro/public-site-intro.test.tsx` | First-visit, letter splitting, timer exit, session suppression, and reduced-motion behavior.                          |
| `src/features/site-language/public-site.tsx`         | Mount the intro only inside the existing public-site boundary.                                                        |
| `src/features/site-language/public-site.test.tsx`    | Regression that the boundary owns the intro while preserving locale and direction.                                    |
| `src/styles.css`                                     | Intro layout, exact stagger transition hooks, exit fade, scroll lock, responsive sizing, and reduced-motion fallback. |
| `src/test/motion-css.test.ts`                        | Source-contract coverage for intro timing hooks and required reduced-motion CSS.                                      |

### Task 1: Build the session-gated intro component

**Files:**

- Create: `src/features/site-intro/public-site-intro.tsx`
- Create: `src/features/site-intro/public-site-intro.test.tsx`

**Interfaces:**

- Produces `PUBLIC_SITE_INTRO_SESSION_KEY = "besan.public-intro.seen"`.
- Produces `PublicSiteIntro(): JSX.Element | null` with no props.
- Consumes the existing `@/assets/besan-logo.png` asset and browser `sessionStorage`/`matchMedia` APIs.

- [ ] **Step 1: Write the failing component tests**

Create `src/features/site-intro/public-site-intro.test.tsx`:

```tsx
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_SITE_INTRO_SESSION_KEY, PublicSiteIntro } from "./public-site-intro";

const normalMotion = vi.fn().mockReturnValue({ matches: false });

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", normalMotion);
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("public-site-intro-active");
  document.body.inert = false;
});

describe("PublicSiteIntro", () => {
  it("renders the monogram and 13 independently animated letters on first visit", () => {
    render(<PublicSiteIntro />);

    expect(screen.getByTestId("public-site-intro")).not.toBeNull();
    expect(screen.getByAltText("Besan Khalaily monogram")).not.toBeNull();
    expect(screen.getByLabelText("BESAN KHALAILY")).not.toBeNull();
    expect(screen.getAllByTestId("intro-letter")).toHaveLength(13);
    expect(sessionStorage.getItem(PUBLIC_SITE_INTRO_SESSION_KEY)).toBe("1");
    expect(document.documentElement.classList.contains("public-site-intro-active")).toBe(true);
    expect(document.body.inert).toBe(true);
  });

  it("starts hiding at 1800ms and unmounts at 2000ms", () => {
    render(<PublicSiteIntro />);

    act(() => vi.advanceTimersByTime(1_800));
    expect(screen.getByTestId("public-site-intro").classList.contains("is-hiding")).toBe(true);

    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByTestId("public-site-intro")).toBeNull();
    expect(document.documentElement.classList.contains("public-site-intro-active")).toBe(false);
    expect(document.body.inert).toBe(false);
  });

  it("does not replay after the session flag has been written", () => {
    sessionStorage.setItem(PUBLIC_SITE_INTRO_SESSION_KEY, "1");
    render(<PublicSiteIntro />);
    expect(screen.queryByTestId("public-site-intro")).toBeNull();
  });

  it("shortens the sequence for reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    render(<PublicSiteIntro />);

    act(() => vi.advanceTimersByTime(50));
    expect(screen.getByTestId("public-site-intro").classList.contains("is-hiding")).toBe(true);

    act(() => vi.advanceTimersByTime(100));
    expect(screen.queryByTestId("public-site-intro")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/site-intro/public-site-intro.test.tsx`

Expected: FAIL because `./public-site-intro` does not exist.

- [ ] **Step 3: Implement the minimal accessible component**

Create `src/features/site-intro/public-site-intro.tsx`:

```tsx
import { useEffect, useState } from "react";
import besanLogo from "@/assets/besan-logo.png";

export const PUBLIC_SITE_INTRO_SESSION_KEY = "besan.public-intro.seen";

const WORDMARK = "BESAN KHALAILY";
const NORMAL_HIDE_DELAY = 1_800;
const NORMAL_REMOVE_DELAY = 2_000;
const REDUCED_HIDE_DELAY = 50;
const REDUCED_REMOVE_DELAY = 150;

type IntroPhase = "checking" | "shown" | "hiding" | "done";

function hasSeenIntro() {
  try {
    return sessionStorage.getItem(PUBLIC_SITE_INTRO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberIntro() {
  try {
    sessionStorage.setItem(PUBLIC_SITE_INTRO_SESSION_KEY, "1");
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function PublicSiteIntro() {
  const [phase, setPhase] = useState<IntroPhase>("checking");

  useEffect(() => {
    if (hasSeenIntro()) {
      setPhase("done");
      return;
    }

    rememberIntro();
    const previousBodyInert = document.body.inert;
    document.documentElement.classList.add("public-site-intro-active");
    document.body.inert = true;
    setPhase("shown");

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const hideDelay = reducedMotion ? REDUCED_HIDE_DELAY : NORMAL_HIDE_DELAY;
    const removeDelay = reducedMotion ? REDUCED_REMOVE_DELAY : NORMAL_REMOVE_DELAY;
    const hideTimer = window.setTimeout(() => setPhase("hiding"), hideDelay);
    const removeTimer = window.setTimeout(() => {
      document.documentElement.classList.remove("public-site-intro-active");
      document.body.inert = previousBodyInert;
      setPhase("done");
    }, removeDelay);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
      document.documentElement.classList.remove("public-site-intro-active");
      document.body.inert = previousBodyInert;
    };
  }, []);

  if (phase === "done") return null;

  let letterIndex = 0;

  return (
    <div
      data-testid="public-site-intro"
      className={`public-site-intro t-stagger ${phase === "shown" ? "is-shown" : ""} ${phase === "hiding" ? "is-hiding" : ""}`}
    >
      <div className="public-site-intro__lockup" dir="ltr">
        <img
          src={besanLogo}
          alt="Besan Khalaily monogram"
          className="public-site-intro__logo t-stagger-line"
        />
        <p className="public-site-intro__wordmark" aria-label={WORDMARK}>
          {Array.from(WORDMARK).map((character, index) => {
            if (character === " ") {
              return (
                <span
                  key={`space-${index}`}
                  className="public-site-intro__space"
                  aria-hidden="true"
                />
              );
            }

            const delay = 300 + letterIndex * 45;
            letterIndex += 1;
            return (
              <span
                key={`${character}-${index}`}
                className="public-site-intro__letter"
                aria-hidden="true"
              >
                <span
                  data-testid="intro-letter"
                  className="t-stagger-line"
                  style={{ transitionDelay: `${delay}ms` }}
                >
                  {character}
                </span>
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the component tests to verify they pass**

Run: `npm test -- src/features/site-intro/public-site-intro.test.tsx`

Expected: 4 tests PASS with no timer or React `act(...)` warnings.

- [ ] **Step 5: Commit the component**

```powershell
git add src/features/site-intro/public-site-intro.tsx src/features/site-intro/public-site-intro.test.tsx
git commit -m "feat: add session-gated public intro"
```

### Task 2: Style and mount the intro inside the public-site boundary

**Files:**

- Modify: `src/styles.css`
- Modify: `src/features/site-language/public-site.tsx`
- Create: `src/features/site-language/public-site.test.tsx`
- Modify: `src/test/motion-css.test.ts`

**Interfaces:**

- Consumes `PublicSiteIntro()` from Task 1.
- Preserves the existing `PublicSite({ locale, children })` signature and `data-testid="public-site"` locale boundary.
- Produces `.public-site-intro`, `.public-site-intro__*`, `.t-stagger`, `.t-stagger-line`, `.is-shown`, `.is-hiding`, and `.public-site-intro-active` CSS hooks.

- [ ] **Step 1: Write failing boundary and CSS source-contract tests**

Create `src/features/site-language/public-site.test.tsx`:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicSite } from "./public-site";

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("public-site-intro-active");
});

describe("PublicSite", () => {
  it("mounts the intro inside the Arabic public boundary", () => {
    render(
      <PublicSite locale="ar">
        <main>Public page</main>
      </PublicSite>,
    );
    const boundary = screen.getByTestId("public-site");
    expect(boundary.getAttribute("lang")).toBe("ar");
    expect(boundary.getAttribute("dir")).toBe("rtl");
    expect(boundary.contains(screen.getByTestId("public-site-intro"))).toBe(true);
  });
});
```

Append this test to `src/test/motion-css.test.ts`:

```ts
it("defines the public intro stagger, exit, and reduced-motion contracts", () => {
  expect(css).toContain("--stagger-stagger: 40ms");
  expect(css).toContain(".t-stagger.is-shown .t-stagger-line");
  expect(css).toContain(".t-stagger.is-hiding .t-stagger-line");
  expect(css).toContain(".public-site-intro.is-hiding");
  expect(css).toContain(".public-site-intro-active");
  expect(css).toContain(".t-stagger-line { transition: none !important; }");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/features/site-language/public-site.test.tsx src/test/motion-css.test.ts`

Expected: FAIL because `PublicSiteIntro` is not mounted and the intro CSS contracts are absent.

- [ ] **Step 3: Mount the component inside the existing public boundary**

Update `src/features/site-language/public-site.tsx` to import the component and render it before existing children:

```tsx
import type { ReactNode } from "react";
import { PublicSiteIntro } from "@/features/site-intro/public-site-intro";
import type { SiteLocale } from "@/features/seo/site-config";
import { SiteLanguageProvider, useSiteLanguage } from "./site-language";

export function PublicSite({ locale, children }: { locale: SiteLocale; children: ReactNode }) {
  return (
    <SiteLanguageProvider locale={locale}>
      <PublicSiteBoundary>{children}</PublicSiteBoundary>
    </SiteLanguageProvider>
  );
}

function PublicSiteBoundary({ children }: { children: ReactNode }) {
  const { direction, locale } = useSiteLanguage();
  return (
    <div
      data-testid="public-site"
      lang={locale}
      dir={direction}
      className={locale === "ar" ? "public-site-arabic" : ""}
    >
      <PublicSiteIntro />
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Add the stagger transition and intro composition CSS**

Add the semantic values below inside the existing `:root` block in `src/styles.css`:

```css
--stagger-dur: 500ms;
--stagger-distance: 12px;
--stagger-stagger: 40ms;
--stagger-blur: 3px;
--stagger-ease: cubic-bezier(0.22, 1, 0.36, 1);
```

Add this block before the existing `@media (prefers-reduced-motion: reduce)` section. The `.t-stagger-line` and state rules are the tuned `transitions.dev` text-reveal hooks; the intro-specific selectors only own composition and full-surface exit:

```css
.public-site-intro-active,
.public-site-intro-active body {
  overflow: hidden;
}

.public-site-intro {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: var(--background);
  color: var(--foreground);
  opacity: 1;
  transition: opacity 200ms ease;
}

.public-site-intro.is-hiding {
  opacity: 0;
  pointer-events: none;
}

.public-site-intro__lockup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(1.25rem, 3vw, 1.75rem);
  padding: 1.5rem;
}

.public-site-intro__logo {
  width: clamp(5.5rem, 9vw, 7rem);
  height: auto;
}

.public-site-intro__wordmark {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.75rem, 5.25vw, 4.75rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: 0.015em;
  white-space: nowrap;
}

.public-site-intro__letter {
  display: inline-block;
  overflow: visible;
}

.public-site-intro__space {
  width: 0.28em;
}

.t-stagger-line {
  display: block;
  opacity: 0;
  transform: translateY(var(--stagger-distance));
  filter: blur(var(--stagger-blur));
  transition:
    opacity var(--stagger-dur) var(--stagger-ease),
    transform var(--stagger-dur) var(--stagger-ease),
    filter var(--stagger-dur) var(--stagger-ease);
  will-change: transform, opacity, filter;
}

.t-stagger.is-shown .t-stagger-line {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

.t-stagger.is-hiding .t-stagger-line {
  opacity: 0;
  transform: translateY(0);
  filter: blur(0);
  transition:
    opacity 200ms ease,
    transform 0s linear,
    filter 0s linear;
  transition-delay: 0s !important;
}
```

Add these declarations inside the existing reduced-motion media query:

```css
.public-site-intro {
  transition-duration: 100ms;
}

.t-stagger-line {
  transition: none !important;
}
```

- [ ] **Step 5: Run the focused tests and commit the integration**

Run: `npm test -- src/features/site-intro/public-site-intro.test.tsx src/features/site-language/public-site.test.tsx src/components/site-shell.test.tsx src/test/motion-css.test.ts`

Expected: all focused tests PASS; existing public shell tests continue to pass with the intro mounted.

Then commit:

```powershell
git add src/styles.css src/features/site-language/public-site.tsx src/features/site-language/public-site.test.tsx src/test/motion-css.test.ts
git commit -m "feat: reveal public brand intro"
```

### Task 3: Complete automated and visual verification

**Files:**

- Modify only files from Tasks 1-2 if verification exposes a scoped defect.

**Interfaces:**

- The complete public intro behavior is the testable deliverable.
- No new production API is introduced in this task.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`

Expected: all Vitest files PASS. If a pre-existing public-site test shares `sessionStorage`, add `sessionStorage.clear()` to that test file's existing cleanup/setup rather than weakening the intro gate.

- [ ] **Step 2: Run static analysis and the production build**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

Run: `npm run build`

Expected: exit code 0 and TanStack Start produces the production output successfully.

- [ ] **Step 3: Verify the public intro visually at desktop and mobile sizes**

Run: `npm run dev`

Open `/` with a fresh browser session and verify at 1440×900 and 390×844:

- The cream overlay covers the first viewport without flashing the page beneath it.
- The monogram is centered and sharp.
- `BESAN KHALAILY` stays on one line and its 13 letters reveal left to right.
- The overlay fades out at about two seconds and scrolling is restored.
- Navigating to `/workshops` and `/book-call` in the same session does not replay the intro.
- Opening a new browser session replays the intro once.
- Emulating reduced motion removes the stagger/spatial movement and dismisses the intro promptly.
- `/dashboard` and `/auth` never mount `[data-testid="public-site-intro"]`.

- [ ] **Step 4: Commit any verification-only corrections**

If Step 3 required a scoped correction, run the focused test for the changed file, then:

```powershell
git add src/features/site-intro/public-site-intro.tsx src/features/site-intro/public-site-intro.test.tsx src/features/site-language/public-site.tsx src/features/site-language/public-site.test.tsx src/styles.css src/test/motion-css.test.ts
git commit -m "fix: polish public intro behavior"
```

If no corrections were needed, do not create an empty commit.
