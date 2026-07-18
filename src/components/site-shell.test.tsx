import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicSite } from "@/features/site-language/public-site";
import { Reveal, SiteNav } from "./site-shell";

vi.mock("@tanstack/react-router", () => ({ useLocation: () => ({ pathname: "/" }) }));

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

describe("SiteNav", () => {
  it("switches the public shell to Arabic", () => {
    render(<PublicSite><SiteNav /></PublicSite>);

    fireEvent.click(screen.getByRole("button", { name: /switch language/i }));

    expect(screen.getByTestId("public-site").getAttribute("dir")).toBe("rtl");
    expect(screen.getByRole("link", { name: "احجزي موعدًا" })).toBeTruthy();
  });
});
