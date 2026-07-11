import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDashboardState } from "./dashboard-data";
import { DashboardAvailability } from "./dashboard-availability";

afterEach(cleanup);

describe("DashboardAvailability", () => {
  it("toggles a slot and reminder channel", () => {
    const dispatch = vi.fn();
    render(
      <DashboardAvailability
        availability={demoDashboardState.availability}
        reminderSettings={demoDashboardState.reminderSettings}
        dispatch={dispatch}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sunday 10:00 to 11:00 available" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "availability/toggle", slotId: "sunday-10" });
    fireEvent.click(screen.getByLabelText("Remind customer via WhatsApp"));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "reminders/update" }));
  });
});
