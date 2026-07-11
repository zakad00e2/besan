import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateScoreAverage,
  ScoreDistributionChart,
} from "./score-distribution-chart";

afterEach(cleanup);

vi.stubGlobal(
  "ResizeObserver",
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const scoreDist = { high: 8, good: 4, medium: 2, low: 1 };

describe("calculateScoreAverage", () => {
  it("calculates the weighted bucket estimate", () => {
    expect(calculateScoreAverage(scoreDist)).toBeCloseTo(4.36, 2);
  });

  it("returns zero for an empty distribution", () => {
    expect(calculateScoreAverage({ high: 0, good: 0, medium: 0, low: 0 })).toBe(0);
  });
});

describe("ScoreDistributionChart", () => {
  it("renders the four score buckets and uses an explicit average", () => {
    render(<ScoreDistributionChart scoreDist={scoreDist} avgScore={4.6} />);

    expect(screen.getByText("توزيع التقييمات")).toBeTruthy();
    expect(screen.getByText("4.6")).toBeTruthy();
    expect(screen.getByText("4.5+")).toBeTruthy();
    expect(screen.getByText("4.0–4.4")).toBeTruthy();
    expect(screen.getByText("3.5–3.9")).toBeTruthy();
    expect(screen.getByText("أقل من 3.5")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
  });

  it("displays the calculated average when avgScore is absent", () => {
    render(<ScoreDistributionChart scoreDist={scoreDist} />);

    expect(screen.getByText("4.4")).toBeTruthy();
  });
});
