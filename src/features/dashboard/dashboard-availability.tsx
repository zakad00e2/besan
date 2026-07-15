import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { parseWeeklySchedule } from "@/features/availability/availability-domain";
import type { AvailabilityMutationResult } from "@/features/availability/availability-service";
import type {
  AvailabilityConfiguration,
  AvailabilityOverrideInput,
  AvailabilityWindow,
  OccupiedAppointment,
  WeeklyScheduleInput,
} from "@/features/availability/availability-domain";
import type { ReminderSettings } from "./dashboard-model";

const weekdayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
type ExceptionDraft = {
  id?: string;
  kind: "closed" | "custom-hours";
  startsOn: string;
  endsOn: string;
  note: string;
  windows: AvailabilityWindow[];
};
type ConflictRetry =
  | { kind: "weekly"; input: WeeklyScheduleInput; conflicts: OccupiedAppointment[] }
  | { kind: "override"; input: AvailabilityOverrideInput; conflicts: OccupiedAppointment[] }
  | { kind: "delete"; id: string; conflicts: OccupiedAppointment[] };

type DashboardAvailabilityProps = {
  configuration: AvailabilityConfiguration;
  pending: boolean;
  onSaveWeekly(
    input: WeeklyScheduleInput,
    confirmConflicts: boolean,
  ): Promise<AvailabilityMutationResult>;
  onSaveOverride(
    input: AvailabilityOverrideInput,
    confirmConflicts: boolean,
  ): Promise<AvailabilityMutationResult>;
  onDeleteOverride(id: string, confirmConflicts: boolean): Promise<AvailabilityMutationResult>;
  reminderSettings: ReminderSettings;
  onReminderChange(settings: ReminderSettings): void;
};

const emptyDraft = (): ExceptionDraft => ({
  kind: "closed",
  startsOn: "",
  endsOn: "",
  note: "",
  windows: [],
});
const rangeLabel = (startsOn: string, endsOn: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).formatRange(
    new Date(`${startsOn}T12:00:00`),
    new Date(`${endsOn}T12:00:00`),
  );

export function DashboardAvailability({
  configuration,
  pending,
  onSaveWeekly,
  onSaveOverride,
  onDeleteOverride,
  reminderSettings,
  onReminderChange,
}: DashboardAvailabilityProps) {
  const [draft, setDraft] = useState(configuration.weekly);
  const [exception, setException] = useState<ExceptionDraft>(emptyDraft);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [retry, setRetry] = useState<ConflictRetry>();
  const [alert, setAlert] = useState("");
  const [weeklyFieldErrors, setWeeklyFieldErrors] = useState<Record<string, string>>({});
  useEffect(() => setDraft(configuration.weekly), [configuration]);
  const updateDay = (
    weekday: number,
    update: (day: (typeof draft)[number]) => (typeof draft)[number],
  ) => setDraft((days) => days.map((day) => (day.weekday === weekday ? update(day) : day)));
  const process = async (
    result: Promise<AvailabilityMutationResult>,
    next?: Omit<ConflictRetry, "conflicts">,
  ) => {
    const value = await result;
    if (value.success) {
      toast.success("Availability saved.");
      setDialogOpen(false);
      return;
    }
    if (value.reason === "conflicts" && next)
      setRetry({ ...next, conflicts: value.conflicts } as ConflictRetry);
    else if (value.reason === "validation") {
      if (next?.kind === "weekly") {
        setWeeklyFieldErrors(value.fieldErrors);
        setAlert(value.fieldErrors.schedule || "");
      } else setAlert(Object.values(value.fieldErrors).join(" "));
    } else
      setAlert(
        value.reason === "overlap"
          ? "This exception overlaps an existing exception."
          : "Could not save availability.",
      );
  };
  const saveWeekly = () => {
    const input = { days: draft };
    const parsed = parseWeeklySchedule(input);
    if (!parsed.success) {
      setWeeklyFieldErrors(parsed.fieldErrors);
      setAlert(parsed.fieldErrors.schedule || "");
      return;
    }
    setWeeklyFieldErrors({});
    setAlert("");
    void process(onSaveWeekly(input, false), { kind: "weekly", input });
  };
  const saveException = () => {
    const input: AvailabilityOverrideInput = exception;
    void process(onSaveOverride(input, false), { kind: "override", input });
  };
  const confirmConflict = () => {
    if (!retry) return;
    const next =
      retry.kind === "weekly"
        ? onSaveWeekly(retry.input, true)
        : retry.kind === "override"
          ? onSaveOverride(retry.input, true)
          : onDeleteOverride(retry.id, true);
    setRetry(undefined);
    void process(next);
  };
  const setKind = (kind: ExceptionDraft["kind"]) =>
    setException((value) =>
      kind === "closed"
        ? { ...value, kind, windows: [] }
        : {
            ...value,
            kind,
            endsOn: value.startsOn,
            windows: [{ startsAt: "11:00", endsAt: "17:00" }],
          },
    );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Weekly availability</h2>
        <p className="mt-1 text-sm text-slate-500">
          Times use Palestine time ({configuration.timezone}). Appointments are{" "}
          <span>{configuration.slotDurationMinutes} minutes</span>.
        </p>
        {alert && (
          <p role="alert" className="mt-3 text-sm text-rose-600">
            {alert}
          </p>
        )}
        <div className="mt-5 space-y-3">
          {weekdayLabels.map((label, weekday) => {
            const day = draft.find((item) => item.weekday === weekday)!;
            const dayErrors = Object.entries(weeklyFieldErrors)
              .filter(([field]) => field.startsWith(`days.${weekday}.`))
              .map(([, message]) => message);
            return (
              <div key={label} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <strong>{label}</strong>
                  <Switch
                    aria-label={`${label} open`}
                    checked={day.isEnabled}
                    onCheckedChange={(isEnabled) =>
                      updateDay(weekday, (current) => ({ ...current, isEnabled }))
                    }
                  />
                </div>
                <div className="mt-3 space-y-2">
                  {day.windows.map((window, index) => (
                    <div key={index} className="flex flex-wrap gap-2">
                      <Input
                        aria-label={`${label} start time`}
                        type="time"
                        step={1800}
                        disabled={!day.isEnabled}
                        value={window.startsAt}
                        onChange={(event) =>
                          updateDay(weekday, (current) => ({
                            ...current,
                            windows: current.windows.map((item, i) =>
                              i === index ? { ...item, startsAt: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                      <Input
                        aria-label={`${label} end time`}
                        type="time"
                        step={1800}
                        disabled={!day.isEnabled}
                        value={window.endsAt}
                        onChange={(event) =>
                          updateDay(weekday, (current) => ({
                            ...current,
                            windows: current.windows.map((item, i) =>
                              i === index ? { ...item, endsAt: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                      {day.windows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label={`Remove ${label} hours`}
                          onClick={() =>
                            updateDay(weekday, (current) => ({
                              ...current,
                              windows: current.windows.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          Remove {label} hours
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() =>
                    updateDay(weekday, (current) => ({
                      ...current,
                      windows: [...current.windows, { startsAt: "11:00", endsAt: "12:00" }],
                    }))
                  }
                >
                  Add {label} hours
                </Button>
                {dayErrors.map((message) => (
                  <p key={message} role="alert" className="mt-2 text-sm text-rose-600">
                    {label}: {message}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
        <Button type="button" className="mt-5" disabled={pending} onClick={saveWeekly}>
          Save weekly schedule
        </Button>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between gap-3">
          <div>
            <h2 className="font-semibold">Date exceptions</h2>
            <p className="mt-1 text-sm text-slate-500">Use closures or one-day custom hours.</p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setException(emptyDraft());
              setDialogOpen(true);
            }}
          >
            Add date exception
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {[...configuration.overrides]
            .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
            .map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"
              >
                <span>
                  {item.note || (item.kind === "closed" ? "Day off" : "Custom hours")} ·{" "}
                  {rangeLabel(item.startsOn, item.endsOn)}
                  {item.kind === "custom-hours" &&
                    ` · ${item.windows.map((window) => `${window.startsAt}–${window.endsAt}`).join(", ")}`}
                </span>
                <span className="flex gap-2">
                  <Button
                    variant="ghost"
                    type="button"
                    aria-label={`Edit exception ${rangeLabel(item.startsOn, item.endsOn)}`}
                    onClick={() => {
                      setException(item);
                      setDialogOpen(true);
                    }}
                  >
                    Edit exception
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    aria-label={`Delete exception ${rangeLabel(item.startsOn, item.endsOn)}`}
                    onClick={() =>
                      void process(onDeleteOverride(item.id, false), {
                        kind: "delete",
                        id: item.id,
                      })
                    }
                  >
                    Delete exception
                  </Button>
                </span>
              </div>
            ))}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Reminder settings</h2>
        <p className="mt-1 text-sm text-slate-500">Reminder delivery is simulated.</p>
        <label className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Remind customer via WhatsApp</span>
          <Switch
            aria-label="Remind customer via WhatsApp"
            checked={reminderSettings.customerWhatsapp}
            onCheckedChange={(customerWhatsapp) =>
              onReminderChange({ ...reminderSettings, customerWhatsapp })
            }
          />
        </label>
        <label className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Notify supervisor in the dashboard</span>
          <Switch
            aria-label="Notify supervisor in the dashboard"
            checked={reminderSettings.supervisorDashboard}
            onCheckedChange={(supervisorDashboard) =>
              onReminderChange({ ...reminderSettings, supervisorDashboard })
            }
          />
        </label>
      </section>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Date exception</DialogTitle>
            <DialogDescription>Set a day off or custom working hours.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label>
              <input
                aria-label="Day off"
                type="radio"
                checked={exception.kind === "closed"}
                onChange={() => setKind("closed")}
              />{" "}
              Day off
            </label>
            <label>
              <input
                aria-label="Custom hours"
                type="radio"
                checked={exception.kind === "custom-hours"}
                onChange={() => setKind("custom-hours")}
              />{" "}
              Custom hours
            </label>
            {exception.kind === "closed" ? (
              <>
                <Input
                  aria-label="Start date"
                  type="date"
                  value={exception.startsOn}
                  onChange={(e) => setException({ ...exception, startsOn: e.target.value })}
                />
                <Input
                  aria-label="End date"
                  type="date"
                  value={exception.endsOn}
                  onChange={(e) => setException({ ...exception, endsOn: e.target.value })}
                />
              </>
            ) : (
              <>
                <Input
                  aria-label="Date"
                  type="date"
                  value={exception.startsOn}
                  onChange={(e) =>
                    setException({ ...exception, startsOn: e.target.value, endsOn: e.target.value })
                  }
                />
                <Input
                  aria-label="Thursday opening"
                  type="time"
                  step={1800}
                  value={exception.windows[0]?.startsAt || ""}
                  onChange={(e) =>
                    setException({
                      ...exception,
                      windows: [{ ...exception.windows[0], startsAt: e.target.value }],
                    })
                  }
                />
                <Input
                  aria-label="Thursday closing"
                  type="time"
                  step={1800}
                  value={exception.windows[0]?.endsAt || ""}
                  onChange={(e) =>
                    setException({
                      ...exception,
                      windows: [{ ...exception.windows[0], endsAt: e.target.value }],
                    })
                  }
                />
              </>
            )}
            <Textarea
              aria-label="Reason"
              value={exception.note}
              onChange={(e) => setException({ ...exception, note: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" disabled={pending} onClick={saveException}>
              Save exception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(retry)} onOpenChange={(open) => !open && setRetry(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing bookings</AlertDialogTitle>
            <AlertDialogDescription>
              <span>
                {retry?.conflicts.length} existing booking{retry?.conflicts.length === 1 ? "" : "s"}{" "}
                will remain active
              </span>
              .{" "}
              <a href="/dashboard/bookings" className="underline">
                Review bookings
              </a>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConflict}>
              Save without cancelling bookings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
