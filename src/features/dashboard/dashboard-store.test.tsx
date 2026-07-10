import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { demoDashboardState } from "./dashboard-data";
import { DashboardProvider, dashboardReducer, useDashboard } from "./dashboard-store";

afterEach(cleanup);

function Harness() {
  const { state, dispatch } = useDashboard();

  return (
    <>
      <output aria-label="stage">{state.customers[0].stage}</output>
      <button
        onClick={() =>
          dispatch({ type: "customer/stage", customerId: state.customers[0].id, stage: "fitting" })
        }
      >
        update
      </button>
    </>
  );
}

describe("dashboardReducer", () => {
  it("toggles only the requested availability slot", () => {
    const slot = demoDashboardState.availability[0];
    const next = dashboardReducer(demoDashboardState, { type: "availability/toggle", slotId: slot.id });

    expect(next.availability[0].enabled).toBe(!slot.enabled);
    expect(next.availability[1]).toEqual(demoDashboardState.availability[1]);
  });
});

describe("DashboardProvider", () => {
  it("shares mutations with consumers during the mounted session", () => {
    render(
      <DashboardProvider>
        <Harness />
      </DashboardProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "update" }));

    expect(screen.getByLabelText("stage").textContent).toBe("fitting");
  });
});
