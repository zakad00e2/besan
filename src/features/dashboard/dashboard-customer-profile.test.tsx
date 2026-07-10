import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDashboardState } from "./dashboard-data";
import { DashboardCustomerProfile } from "./dashboard-customer-profile";

afterEach(cleanup);

describe("DashboardCustomerProfile", () => {
  it("dispatches stage and note changes", () => {
    const dispatch = vi.fn();
    const customer = demoDashboardState.customers[0];
    render(
      <DashboardCustomerProfile
        customer={customer}
        appointments={demoDashboardState.appointments}
        dispatch={dispatch}
        now={new Date("2026-07-10T08:00:00.000Z")}
      />,
    );
    fireEvent.change(screen.getByLabelText("مرحلة الزبونة"), { target: { value: "fitting" } });
    expect(dispatch).toHaveBeenCalledWith({
      type: "customer/stage",
      customerId: customer.id,
      stage: "fitting",
    });
    fireEvent.change(screen.getByLabelText("ملاحظة جديدة"), {
      target: { value: "تأكيد القماش قبل البروفة" },
    });
    fireEvent.click(screen.getByRole("button", { name: "إضافة الملاحظة" }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "customer/note", customerId: customer.id }),
    );
  });
});
