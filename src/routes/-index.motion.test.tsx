import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OPENING_SPLASH_STORAGE_KEY } from "@/components/opening-splash";
import { HomePage, HowICanHelp, Testimonials } from "./index";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useLocation: () => ({ pathname: "/" }),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("homepage motion", () => {
  it("mounts the opening splash as the first home-page layer", () => {
    render(<HomePage locale="ar" />);
    const publicSite = screen.getByTestId("public-site");
    expect(publicSite.firstElementChild?.getAttribute("data-testid")).toBe("opening-splash");
    expect(sessionStorage.getItem(OPENING_SPLASH_STORAGE_KEY)).toBeNull();
  });

  it("renders the Arabic home route without browser locale storage", () => {
    render(<HomePage locale="ar" />);
    expect(screen.getByTestId("public-site").getAttribute("lang")).toBe("ar");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("بيسان");
  });

  it("keeps the existing English home content on the English route", () => {
    render(<HomePage locale="en" />);
    expect(screen.getByTestId("public-site").getAttribute("lang")).toBe("en");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("BESAN");
  });

  it("retargets rapid testimonial navigation to the latest quote", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    render(<Testimonials />);

    const next = screen.getByRole("button", { name: "Next" });
    fireEvent.click(next);
    fireEvent.click(next);

    expect(screen.getByTestId("testimonial-copy").className).toContain("opacity-0");
    act(() => vi.advanceTimersByTime(90));
    expect(screen.getByText(/Besan understood exactly what I had in mind/)).toBeTruthy();
    expect(screen.getByTestId("testimonial-copy").className).toContain("opacity-100");
  });

  it("uses one continuous accordion indicator and scoped panel transition", () => {
    render(<HowICanHelp />);
    fireEvent.click(screen.getByRole("button", { name: "Ready-to-Wear Collections" }));

    const indicator = screen.getByTestId("service-indicator-1");
    const panel = screen.getByTestId("service-panel-1");
    expect(indicator.getAttribute("data-state")).toBe("open");
    expect(panel.className).toContain("transition-[grid-template-rows,padding-bottom]");
    expect(panel.className).not.toContain("transition-all");
  });
});
