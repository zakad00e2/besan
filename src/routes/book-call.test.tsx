import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/site-shell", () => ({
  SiteFooter: () => null,
  SiteNav: () => null,
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockReturnValue({ matches: true }),
});

import { BookCall } from "./book-call";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-15T12:00:00"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("book-call route", () => {
  it("shows the preserved schedule after a bookable day is selected", () => {
    render(<BookCall />);

    fireEvent.click(screen.getByRole("button", { name: /monday, july 20th, 2026/i }));

    expect(screen.getAllByRole("button", { name: "10:00" })).toHaveLength(2);
  });
});
