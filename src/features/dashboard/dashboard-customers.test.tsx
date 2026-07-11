import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { demoDashboardState } from "./dashboard-data";
import { DashboardCustomers } from "./dashboard-customers";

afterEach(cleanup);

describe("DashboardCustomers", () => {
  it("filters the directory by customer name", () => {
    render(
      <DashboardCustomers
        customers={demoDashboardState.customers}
        appointments={demoDashboardState.appointments}
      />,
    );
    fireEvent.change(screen.getByLabelText("Search customers"), { target: { value: "Layan" } });
    expect(screen.getByRole("link", { name: /Layan Mansour/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Sarah Khalil/ })).toBeNull();
  });
});
