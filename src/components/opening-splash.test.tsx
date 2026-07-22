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

    act(() => vi.advanceTimersByTime(1059));
    expect(screen.getByTestId("opening-splash").dataset.state).toBe("active");

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId("opening-splash").dataset.state).toBe("exiting");

    act(() => vi.advanceTimersByTime(300));
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
