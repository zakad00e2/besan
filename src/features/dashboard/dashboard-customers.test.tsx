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
    fireEvent.change(screen.getByLabelText("البحث عن زبونة"), { target: { value: "ليان" } });
    expect(screen.getByRole("link", { name: /ليان منصور/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /سارة خليل/ })).toBeNull();
  });
});
