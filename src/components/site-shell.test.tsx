import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicSite } from "@/features/site-language/public-site";
import { Reveal, SiteNav } from "./site-shell";

let pathname = "/";
vi.mock("@tanstack/react-router", () => ({ useLocation: () => ({ pathname }) }));

afterEach(cleanup);

describe("Reveal", () => {
  it("server-renders its content visible when hydration is unavailable", () => {
    const html = renderToString(<Reveal>Copy</Reveal>);

    expect(html).toContain("opacity-100");
    expect(html).not.toContain("opacity-0");
  });

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

describe("SiteNav", () => {
  it("links an Arabic page to its English equivalent", () => {
    pathname = "/workshops";
    render(
      <PublicSite locale="ar">
        <SiteNav />
      </PublicSite>,
    );

    expect(screen.getByRole("link", { name: "تغيير اللغة" }).getAttribute("href")).toBe(
      "/en/workshops",
    );
  });

  it("links an English page to its Arabic equivalent", () => {
    pathname = "/en/book-call";
    render(
      <PublicSite locale="en">
        <SiteNav />
      </PublicSite>,
    );

    expect(screen.getByRole("link", { name: "Switch language" }).getAttribute("href")).toBe(
      "/book-call",
    );
  });
});
