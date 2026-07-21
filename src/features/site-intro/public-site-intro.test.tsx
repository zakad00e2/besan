import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
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
  it("does not server-render a blank overlay before hydration", () => {
    const html = renderToString(<PublicSiteIntro />);

    expect(html).not.toContain('data-testid="public-site-intro"');
  });

  it("renders the monogram without making the application body inert", () => {
    render(<PublicSiteIntro />);

    expect(screen.getByTestId("public-site-intro")).not.toBeNull();
    expect(screen.getByAltText("Besan Khalaily monogram")).not.toBeNull();
    expect(screen.getByLabelText("BESAN KHALAILY")).not.toBeNull();
    expect(screen.getAllByTestId("intro-letter")).toHaveLength(13);
    expect(sessionStorage.getItem(PUBLIC_SITE_INTRO_SESSION_KEY)).toBe("1");
    expect(document.documentElement.classList.contains("public-site-intro-active")).toBe(true);
    expect(document.body.inert).not.toBe(true);
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
