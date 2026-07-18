import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HowICanHelp, Testimonials } from "./index";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("homepage motion", () => {
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
    expect(screen.getByText(/A rare designer who listens/)).toBeTruthy();
    expect(screen.getByTestId("testimonial-copy").className).toContain("opacity-100");
  });

  it("uses one continuous accordion indicator and scoped panel transition", () => {
    render(<HowICanHelp />);
    fireEvent.click(screen.getByRole("button", { name: "Bridal & Evening Wear" }));

    const indicator = screen.getByTestId("service-indicator-1");
    const panel = screen.getByTestId("service-panel-1");
    expect(indicator.getAttribute("data-state")).toBe("open");
    expect(panel.className).toContain("transition-[grid-template-rows,padding-bottom]");
    expect(panel.className).not.toContain("transition-all");
  });
});
