import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AvailabilityConfiguration } from "@/features/availability/availability-domain";
import { DashboardAvailability } from "./dashboard-availability";

afterEach(cleanup);

const configuration: AvailabilityConfiguration = {
  timezone: "Asia/Jerusalem",
  slotDurationMinutes: 60,
  weekly: Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    isEnabled: weekday !== 4,
    windows: [{ startsAt: "11:00", endsAt: "17:00" }],
  })),
  overrides: [
    {
      id: "override-1",
      kind: "closed",
      startsOn: "2026-08-01",
      endsOn: "2026-08-02",
      note: "Holiday",
      windows: [],
    },
  ],
};
function renderEditor(overrides: Partial<React.ComponentProps<typeof DashboardAvailability>> = {}) {
  const onSaveWeekly = vi.fn().mockResolvedValue({ success: true, configuration });
  const onSaveOverride = vi.fn().mockResolvedValue({ success: true, configuration });
  const onDeleteOverride = vi.fn().mockResolvedValue({ success: true, configuration });
  const onReminderChange = vi.fn();
  render(
    <DashboardAvailability
      configuration={configuration}
      pending={false}
      onSaveWeekly={onSaveWeekly}
      onSaveOverride={onSaveOverride}
      onDeleteOverride={onDeleteOverride}
      reminderSettings={{ customerWhatsapp: true, supervisorDashboard: true, hoursBefore: 24 }}
      onReminderChange={onReminderChange}
      {...overrides}
    />,
  );
  return { onSaveWeekly, onSaveOverride, onDeleteOverride, onReminderChange };
}

describe("DashboardAvailability", () => {
  it("edits weekly availability and retains reminder controls", () => {
    const { onSaveWeekly, onReminderChange } = renderEditor();
    expect(screen.getByRole("heading", { name: "Weekly availability" })).toBeTruthy();
    expect(screen.getByLabelText("Thursday open").getAttribute("data-state")).toBe("unchecked");
    expect(screen.getByText("60 minutes")).toBeTruthy();
    expect(screen.getByText(/Asia\/Jerusalem/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add Sunday hours" }));
    expect(screen.getAllByLabelText("Sunday start time")).toHaveLength(2);
    fireEvent.change(screen.getAllByLabelText("Sunday start time")[1], {
      target: { value: "17:00" },
    });
    fireEvent.change(screen.getAllByLabelText("Sunday end time")[1], {
      target: { value: "18:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save weekly schedule" }));
    expect(onSaveWeekly).toHaveBeenCalledWith(
      expect.objectContaining({ days: expect.any(Array) }),
      false,
    );
    fireEvent.click(screen.getByLabelText("Remind customer via WhatsApp"));
    expect(onReminderChange).toHaveBeenCalledWith({
      customerWhatsapp: false,
      supervisorDashboard: true,
      hoursBefore: 24,
    });
    expect(screen.getByText("Reminder delivery is simulated.")).toBeTruthy();
  });

  it("blocks an invalid weekly schedule and identifies the affected day", () => {
    const { onSaveWeekly } = renderEditor();
    fireEvent.change(screen.getByLabelText("Sunday end time"), { target: { value: "11:30" } });

    fireEvent.click(screen.getByRole("button", { name: "Save weekly schedule" }));

    expect(onSaveWeekly).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Sunday");
    expect(screen.getByRole("alert").textContent).toContain("at least 60 minutes");
  });

  it("updates the supervisor reminder without dropping the other reminder settings", () => {
    const { onReminderChange } = renderEditor();

    fireEvent.click(screen.getByLabelText("Notify supervisor in the dashboard"));

    expect(onReminderChange).toHaveBeenCalledWith({
      customerWhatsapp: true,
      supervisorDashboard: false,
      hoursBefore: 24,
    });
  });

  it("saves an inclusive travel closure", () => {
    const { onSaveOverride } = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Add date exception" }));
    fireEvent.click(screen.getByLabelText("Day off"));
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-08-10" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-08-20" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Travel" } });
    fireEvent.click(screen.getByRole("button", { name: "Save exception" }));
    expect(onSaveOverride).toHaveBeenCalledWith(
      { kind: "closed", startsOn: "2026-08-10", endsOn: "2026-08-20", note: "Travel", windows: [] },
      false,
    );
  });

  it("saves custom hours and supports editing and deleting an exception", async () => {
    const { onSaveOverride, onDeleteOverride } = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Add date exception" }));
    fireEvent.click(screen.getByLabelText("Custom hours"));
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-08-13" } });
    fireEvent.change(screen.getByLabelText("Thursday opening"), { target: { value: "11:30" } });
    fireEvent.change(screen.getByLabelText("Thursday closing"), { target: { value: "13:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save exception" }));
    await waitFor(() =>
      expect(onSaveOverride).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "custom-hours",
          startsOn: "2026-08-13",
          endsOn: "2026-08-13",
          windows: [{ startsAt: "11:30", endsAt: "13:30" }],
        }),
        false,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /Edit exception.*Aug 1.*2, 2026/ }));
    expect(screen.getByDisplayValue("Holiday")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: /Delete exception.*Aug 1.*2, 2026/ }));
    expect(onDeleteOverride).toHaveBeenCalledWith("override-1", false);
  });

  it("requires confirmation before retaining conflicting bookings", async () => {
    const conflict = {
      success: false as const,
      reason: "conflicts" as const,
      conflicts: [
        {
          id: "appointment-1",
          date: "2026-08-12",
          startsAt: "11:00",
          status: "confirmed" as const,
        },
      ],
    };
    const onSaveWeekly = vi
      .fn()
      .mockResolvedValueOnce(conflict)
      .mockResolvedValueOnce({ success: true, configuration });
    renderEditor({ onSaveWeekly });
    fireEvent.click(screen.getByRole("button", { name: "Save weekly schedule" }));
    expect(await screen.findByText("1 existing booking will remain active")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Review bookings" }).getAttribute("href")).toBe(
      "/dashboard/bookings",
    );
    fireEvent.click(screen.getByRole("button", { name: "Save without cancelling bookings" }));
    expect(onSaveWeekly).toHaveBeenLastCalledWith(expect.any(Object), true);
  });
});
