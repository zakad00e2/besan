import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");

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
    expect(css).toContain("transition-property: transform");
    expect(css).toContain("transition-property: opacity");
    expect(css).not.toContain("transition-property: filter, transform");
  });

  it("provides opacity-only reduced-motion fallbacks for portaled surfaces", () => {
    expect(css).toContain('[data-motion-surface="dialog"]');
    expect(css).toContain('[data-motion-surface="sheet"]');
    expect(css).toContain("animation-name: motion-fade-in");
    expect(css).not.toContain(".dashboard-app *::after");
  });

  it("defines the opening splash and reduced-motion fallback", () => {
    expect(css).toContain('.opening-splash[data-state="exiting"]');
    expect(css).toContain("animation: opening-splash-exit 300ms");
    expect(css).toContain("animation: opening-splash-lockup-exit 180ms");
    expect(css).toContain("animation: opening-splash-mark-in 800ms var(--motion-ease-out) 80ms");
    expect(css).toContain("animation: opening-splash-letter-in 550ms");
    expect(css).toContain("animation-delay: calc(900ms + var(--opening-letter-index) * 55ms)");
    expect(css).toContain("@keyframes opening-splash-exit");
    expect(css).toContain("@keyframes opening-splash-lockup-exit");
    expect(css).not.toContain("clip-path: circle(0% at 50% 50%)");
    expect(css).not.toContain("filter: blur(0.2rem)");
    expect(css).toContain("html:has(.opening-splash)");
    expect(css).toContain("body:has(.opening-splash)");
    expect(css).toContain(".opening-splash__letter");
    expect(css).toContain("width: clamp(6.5rem, 14vw, 10rem)");
    expect(css).toContain("animation: none !important");
  });
});
