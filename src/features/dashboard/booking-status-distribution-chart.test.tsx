import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BookingStatusDistributionChart } from "./booking-status-distribution-chart";

afterEach(cleanup);

describe("BookingStatusDistributionChart", () => {
  it("renders status labels, supplied counts, and their total", () => {
    render(
      <BookingStatusDistributionChart
        statusDist={{ confirmed: 4, pending: 3, completed: 2, cancelled: 1 }}
      />,
    );

    expect(screen.getByText("Booking status distribution")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("Confirmed")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("renders a stable empty distribution", () => {
    render(
      <BookingStatusDistributionChart
        statusDist={{ confirmed: 0, pending: 0, completed: 0, cancelled: 0 }}
      />,
    );

    expect(screen.getByText("0", { selector: "p" })).toBeTruthy();
  });
});
