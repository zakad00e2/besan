import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("page motion contracts", () => {
  it("uses GSAP as the only Book Call entrance system", () => {
    const source = read("src/routes/book-call.tsx");

    expect(source).toContain('import gsap from "gsap"');
    expect(source).not.toContain("<Reveal");
    expect(source).not.toContain("Reveal, SiteFooter");
    expect(source).toContain("stagger: 0.08");
  });

  it("uses pointer-gated editorial image hooks on every workshop card", () => {
    const source = read("src/routes/workshops.tsx");

    expect(source.match(/editorial-image/g)?.length).toBe(3);
    expect(source).not.toContain("duration-500 group-hover:grayscale-0");
  });

  it("reveals both availability grids without broad transitions", () => {
    const source = read("src/routes/book-call.tsx");

    expect(source.match(/data-motion-state="availability"/g)?.length).toBe(2);
    expect(source).not.toContain("transition-all duration-200");
  });
});
