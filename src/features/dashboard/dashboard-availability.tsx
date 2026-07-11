import type { Dispatch } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { AvailabilitySlot, ReminderSettings, WorkingDay } from "./dashboard-model";
import { workingDayLabels } from "./dashboard-model";
import type { DashboardAction } from "./dashboard-store";
import { dashboardSlotDisabledClassName, dashboardSlotEnabledClassName } from "./dashboard-ui";

export function DashboardAvailability({
  availability,
  reminderSettings,
  dispatch,
}: {
  availability: AvailabilitySlot[];
  reminderSettings: ReminderSettings;
  dispatch: Dispatch<DashboardAction>;
}) {
  const days = Object.keys(workingDayLabels) as WorkingDay[];
  function saved(message: string) {
    toast.success(message);
  }
  function updateReminders(patch: Partial<ReminderSettings>) {
    dispatch({ type: "reminders/update", settings: { ...reminderSettings, ...patch } });
    saved("Settings saved.");
  }
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Weekly availability</h2>
            <p className="mt-1 text-sm text-slate-500">Sunday to Thursday, from 10:00 to 18:00.</p>
          </div>
          <p className="text-xs text-slate-500">Select a slot to enable or disable it.</p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-5 gap-3">
            {days.map((day) => (
              <div key={day} className="rounded-lg border border-slate-100 p-2">
                <h3 className="mb-2 text-center text-sm font-semibold">{workingDayLabels[day]}</h3>
                <div className="space-y-2">
                  {availability
                    .filter((slot) => slot.day === day)
                    .map((slot) => {
                      const label = `${workingDayLabels[day]} ${slot.startsAt} to ${slot.endsAt} ${slot.enabled ? "available" : "unavailable"}`;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          aria-label={label}
                          aria-pressed={slot.enabled}
                          onClick={() => {
                            dispatch({ type: "availability/toggle", slotId: slot.id });
                            saved("Availability saved.");
                          }}
                          className={slot.enabled ? dashboardSlotEnabledClassName : dashboardSlotDisabledClassName}
                        >
                          <span dir="ltr">
                            {slot.startsAt}–{slot.endsAt}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Reminder settings</h2>
        <p className="mt-1 text-sm text-slate-500">Reminder delivery is simulated in this demo.</p>
        <div className="mt-5 space-y-4">
          <label className="flex min-h-10 items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Remind customer via WhatsApp</span>
              <span className="mt-1 block text-xs text-slate-500">
                Simulated delivery in this demo.
              </span>
            </span>
            <Switch
              aria-label="Remind customer via WhatsApp"
              checked={reminderSettings.customerWhatsapp}
              onCheckedChange={(checked) => updateReminders({ customerWhatsapp: checked })}
            />
          </label>
          <label className="flex min-h-10 items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Notify supervisor in the dashboard</span>
              <span className="mt-1 block text-xs text-slate-500">
                Appears in tomorrow's reminders.
              </span>
            </span>
            <Switch
              aria-label="Notify supervisor in the dashboard"
              checked={reminderSettings.supervisorDashboard}
              onCheckedChange={(checked) => updateReminders({ supervisorDashboard: checked })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
