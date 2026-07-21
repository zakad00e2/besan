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

  it("defines the public intro stagger, exit, and reduced-motion contracts", () => {
    expect(css).toContain("--stagger-stagger: 40ms");
    expect(css).toContain(".t-stagger.is-shown .t-stagger-line");
    expect(css).toContain(".t-stagger.is-hiding .t-stagger-line");
    expect(css).toContain(".public-site-intro.is-hiding");
    expect(css).toContain(".public-site-intro-active");
    expect(css).toContain(".t-stagger-line {");
    expect(css).toContain("transition: none !important;");
  });
});
