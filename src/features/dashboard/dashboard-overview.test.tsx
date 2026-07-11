import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { demoDashboardState } from "./dashboard-data";
import { DashboardOverview } from "./dashboard-overview";

afterEach(cleanup);

describe("DashboardOverview", () => {
  it("switches between day and week schedule views", () => {
    render(
      <DashboardOverview
        customers={demoDashboardState.customers}
        appointments={demoDashboardState.appointments}
        now={new Date("2026-07-10T08:00:00.000Z")}
      />,
    );

    expect(screen.getByRole("heading", { name: "مواعيد اليوم" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "الأسبوع" }));
    expect(screen.getByRole("heading", { name: "مواعيد الأسبوع" })).toBeTruthy();
  });

  it("shows metrics, reminder queue, and follow-up customers", () => {
    render(
      <DashboardOverview
        customers={demoDashboardState.customers}
        appointments={demoDashboardState.appointments}
        now={new Date("2026-07-10T08:00:00.000Z")}
      />,
    );

    expect(screen.getAllByText("مواعيد اليوم").length).toBeGreaterThan(0);
    expect(screen.getByText("تذكيرات الغد")).toBeTruthy();
    expect(screen.getAllByText("بحاجة لمتابعة").length).toBeGreaterThan(0);
  });
});
