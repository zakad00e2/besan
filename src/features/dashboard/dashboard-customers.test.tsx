import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { dashboardFixture } from "@/test/fixtures/dashboard";
import { CustomerListSkeleton, DashboardCustomers } from "./dashboard-customers";

afterEach(cleanup);

describe("DashboardCustomers", () => {
  it("shows a skeleton instead of loading copy while the customer list is pending", () => {
    render(<CustomerListSkeleton />);

    expect(screen.getByRole("status", { name: "Loading customers" })).toBeTruthy();
    expect(screen.queryByText(/Loading customers/i)).toBeNull();
  });

  it("filters the directory by customer name", () => {
    render(
      <DashboardCustomers
        customers={dashboardFixture.customers}
        appointments={dashboardFixture.appointments}
      />,
    );
    fireEvent.change(screen.getByLabelText("Search customers"), { target: { value: "Layan" } });
    expect(screen.getByRole("link", { name: /Layan Mansour/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Sarah Khalil/ })).toBeNull();
  });
});
