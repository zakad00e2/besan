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
  document.body.inert = false;
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
