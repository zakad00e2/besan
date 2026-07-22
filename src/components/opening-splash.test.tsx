import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpeningSplash } from "./opening-splash";

afterEach(() => {
  cleanup();
  document.documentElement.style.overflow = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("OpeningSplash", () => {
  it("runs, exits, and restores scrolling", () => {
    vi.useFakeTimers();
    render(<OpeningSplash />);

    expect(screen.getByTestId("opening-splash").dataset.state).toBe("active");
    expect(screen.getByText("BESAN KHALAILY")).toBeTruthy();
    expect(document.documentElement.style.overflow).toBe("hidden");

    act(() => vi.advanceTimersByTime(1679));
    expect(screen.getByTestId("opening-splash").dataset.state).toBe("active");

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId("opening-splash").dataset.state).toBe("exiting");

    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByTestId("opening-splash")).toBeNull();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("plays again after the home page mounts in the same tab", () => {
    sessionStorage.setItem("besan-opening-splash:v1", "complete");
    render(<OpeningSplash />);
    expect(screen.getByTestId("opening-splash").dataset.state).toBe("active");
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
