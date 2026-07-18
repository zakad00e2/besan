import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarOff,
  Clock3,
  Plus,
  Settings2,
  Trash2,
  type LucideIcon,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { parseWeeklySchedule } from "@/features/availability/availability-domain";
import type { AvailabilityMutationResult } from "@/features/availability/availability-service";
import type {
  AvailabilityConfiguration,
  AvailabilityOverrideInput,
  AvailabilityWindow,
  OccupiedAppointment,
  WeeklyScheduleInput,
} from "@/features/availability/availability-domain";
import { dashboardPrimaryButtonClassName, dashboardSecondaryButtonClassName } from "./dashboard-ui";

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

function SectionTitle({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-[#e7e7e9] bg-[#fafafa] text-[#74757b]">
        <Icon className="size-3.5 stroke-[1.75]" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-[13px] font-medium leading-tight text-[#29292d]">{title}</h2>
        <p className="mt-1 text-[10px] leading-tight text-[#919299]">{description}</p>
      </div>
    </div>
  );
}

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
  const enabledDays = useMemo(() => draft.filter((day) => day.isEnabled).length, [draft]);

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
    <div className="space-y-3">
      <section className="flex flex-col gap-3 rounded-[10px] border border-[#e6e6e8] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-[#f5f3ff] text-violet-600">
            <Clock3 className="size-4 stroke-[1.75]" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-medium text-[#39393d]">Weekly booking schedule</p>
            <p className="mt-0.5 text-[10px] text-[#96979c]">
              {enabledDays} of 7 days are available for appointments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#898a90]">
          <span className="rounded-full border border-[#e5e5e7] bg-[#fafafa] px-2 py-1 tabular-nums">
            <span>{configuration.slotDurationMinutes} minutes</span> slots
          </span>
          <span className="rounded-full border border-[#e5e5e7] bg-[#fafafa] px-2 py-1" dir="ltr">
            {configuration.timezone}
          </span>
        </div>
      </section>

      {alert && (
        <p
          role="alert"
          className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700"
        >
          {alert}
        </p>
      )}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)] xl:items-start">
        <section className="overflow-hidden rounded-[10px] border border-[#e6e6e8] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#eeeeef] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle
              title="Weekly availability"
              description="Turn a day on, then set the hours customers can book."
              icon={Settings2}
            />
            <span className="text-[10px] text-[#a0a1a6]">All times are local to Palestine.</span>
          </div>

          <div className="divide-y divide-[#eeeeef]">
            {weekdayLabels.map((label, weekday) => {
              const day = draft.find((item) => item.weekday === weekday)!;
              const dayErrors = Object.entries(weeklyFieldErrors)
                .filter(([field]) => field.startsWith(`days.${weekday}.`))
                .map(([, message]) => message);
              return (
                <div
                  key={label}
                  className={cn(
                    "grid gap-3 px-4 py-3 transition-colors duration-[var(--motion-duration-color)] hover:bg-[#fcfcfd] sm:grid-cols-[130px_minmax(0,1fr)_auto] sm:items-start",
                    !day.isEnabled && "bg-[#fcfcfc]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3 pt-1 sm:block">
                    <div className="flex items-center gap-2">
                      <Switch
                        aria-label={`${label} open`}
                        checked={day.isEnabled}
                        onCheckedChange={(isEnabled) =>
                          updateDay(weekday, (current) => ({ ...current, isEnabled }))
                        }
                      />
                      <span className="text-[12px] font-medium text-[#404045]">{label}</span>
                    </div>
                    <span
                      className={cn(
                        "mt-1.5 ml-8 block text-[9px] font-medium",
                        day.isEnabled ? "text-emerald-600" : "text-[#aaabb0]",
                      )}
                    >
                      {day.isEnabled ? "Available" : "Closed"}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-2">
                    {day.isEnabled ? (
                      day.windows.map((window, index) => (
                        <div key={index} className="flex flex-wrap items-center gap-1.5">
                          <Input
                            aria-label={`${label} start time`}
                            type="time"
                            step={1800}
                            value={window.startsAt}
                            onChange={(event) =>
                              updateDay(weekday, (current) => ({
                                ...current,
                                windows: current.windows.map((item, i) =>
                                  i === index ? { ...item, startsAt: event.target.value } : item,
                                ),
                              }))
                            }
                            className="h-8 w-[126px] border-[#e4e4e7] bg-white px-2 text-[11px] shadow-none"
                          />
                          <span className="text-[10px] text-[#a6a7ac]">to</span>
                          <Input
                            aria-label={`${label} end time`}
                            type="time"
                            step={1800}
                            value={window.endsAt}
                            onChange={(event) =>
                              updateDay(weekday, (current) => ({
                                ...current,
                                windows: current.windows.map((item, i) =>
                                  i === index ? { ...item, endsAt: event.target.value } : item,
                                ),
                              }))
                            }
                            className="h-8 w-[126px] border-[#e4e4e7] bg-white px-2 text-[11px] shadow-none"
                          />
                          {day.windows.length > 1 && (
                            <button
                              type="button"
                              aria-label={`Remove ${label} hours`}
                              onClick={() =>
                                updateDay(weekday, (current) => ({
                                  ...current,
                                  windows: current.windows.filter((_, i) => i !== index),
                                }))
                              }
                              className="inline-flex size-8 items-center justify-center rounded-[8px] text-[#a2a3a8] transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="pt-1 text-[10px] text-[#a4a5aa]">
                        No appointments can be booked.
                      </p>
                    )}
                    {dayErrors.map((message) => (
                      <p key={message} role="alert" className="text-[10px] text-rose-600">
                        {label}: {message}
                      </p>
                    ))}
                  </div>

                  <button
                    type="button"
                    aria-label={`Add ${label} hours`}
                    onClick={() =>
                      updateDay(weekday, (current) => ({
                        ...current,
                        isEnabled: true,
                        windows: [...current.windows, { startsAt: "11:00", endsAt: "12:00" }],
                      }))
                    }
                    className="inline-flex h-8 items-center gap-1 self-start rounded-[8px] px-2 text-[10px] font-medium text-[#6d6e74] transition-colors hover:bg-[#f3f3f4] hover:text-[#26262a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add hours
                  </button>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-0 flex flex-col gap-2 border-t border-[#eeeeef] bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-[#95969b]">Changes apply to future booking slots.</p>
            <Button
              type="button"
              disabled={pending}
              onClick={saveWeekly}
              className={cn(dashboardPrimaryButtonClassName, "min-h-8 px-3 text-[10px]")}
            >
              Save weekly schedule
            </Button>
          </div>
        </section>

        <aside className="space-y-3">
          <section className="rounded-[10px] border border-[#e6e6e8] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <SectionTitle
                title="Date exceptions"
                description="Close dates or set different hours when the regular schedule does not apply."
                icon={CalendarOff}
              />
              <Button
                type="button"
                onClick={() => {
                  setException(emptyDraft());
                  setDialogOpen(true);
                }}
                className={cn(dashboardSecondaryButtonClassName, "size-8 shrink-0 p-0")}
                aria-label="Add date exception"
              >
                <Plus className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
            {configuration.overrides.length === 0 ? (
              <div className="mt-4 rounded-[9px] border border-dashed border-[#e4e4e6] bg-[#fcfcfc] px-3 py-4 text-center">
                <CalendarDays className="mx-auto size-4 text-[#b1b2b7]" aria-hidden="true" />
                <p className="mt-2 text-[10px] font-medium text-[#68696f]">
                  No exceptions scheduled
                </p>
                <p className="mt-1 text-[9px] text-[#a0a1a6]">
                  Add holidays, travel days, or custom hours.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-[#f0f0f1]">
                {[...configuration.overrides]
                  .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-[#434348]">
                          {item.note || (item.kind === "closed" ? "Day off" : "Custom hours")}
                        </p>
                        <p className="mt-0.5 text-[9px] leading-snug text-[#97989d]">
                          {rangeLabel(item.startsOn, item.endsOn)}
                          {item.kind === "custom-hours" &&
                            ` · ${item.windows.map((window) => `${window.startsAt}–${window.endsAt}`).join(", ")}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          aria-label={`Edit exception ${rangeLabel(item.startsOn, item.endsOn)}`}
                          onClick={() => {
                            setException(item);
                            setDialogOpen(true);
                          }}
                          className="h-7 rounded-[7px] px-2 text-[9px] font-medium text-[#73747a] transition-colors hover:bg-[#f3f3f4] hover:text-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete exception ${rangeLabel(item.startsOn, item.endsOn)}`}
                          onClick={() =>
                            void process(onDeleteOverride(item.id, false), {
                              kind: "delete",
                              id: item.id,
                            })
                          }
                          className="inline-flex size-7 items-center justify-center rounded-[7px] text-[#aaaab0] transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden border-[#e4e4e7] bg-white p-0 shadow-[0_20px_60px_rgba(24,24,27,0.18)] sm:max-w-[480px]">
          <DialogHeader className="border-b border-[#eeeeef] px-5 pb-4 pt-5 text-left">
            <div className="flex items-start gap-2.5 pr-8">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-[#e6e6e8] bg-[#fafafa] text-[#74757b]">
                <CalendarOff className="size-3.5 stroke-[1.75]" aria-hidden="true" />
              </span>
              <div>
                <DialogTitle className="text-[14px] font-medium tracking-[-0.015em] text-[#29292d]">
                  Date exception
                </DialogTitle>
                <DialogDescription className="mt-1 text-[10px] leading-tight text-[#929399]">
                  Close a date or replace your regular working hours.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 px-5 py-5">
            <fieldset>
              <legend className="text-[10px] font-medium text-[#74757b]">Exception type</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label
                  className={cn(
                    "relative flex min-h-16 cursor-pointer flex-col justify-center rounded-[9px] border px-3 transition-[border-color,background-color,box-shadow] duration-[var(--motion-duration-color)]",
                    exception.kind === "closed"
                      ? "border-[#cfcfd3] bg-[#f8f8f9] shadow-[inset_0_0_0_1px_rgba(22,22,25,0.03)]"
                      : "border-[#e7e7e9] bg-white hover:border-[#d7d7da] hover:bg-[#fcfcfc]",
                  )}
                >
                  <input
                    aria-label="Day off"
                    type="radio"
                    className="sr-only"
                    checked={exception.kind === "closed"}
                    onChange={() => setKind("closed")}
                  />
                  <span className="text-[11px] font-medium text-[#404045]">Day off</span>
                  <span className="mt-0.5 text-[9px] leading-tight text-[#97989e]">
                    Block bookings for one or more days
                  </span>
                </label>
                <label
                  className={cn(
                    "relative flex min-h-16 cursor-pointer flex-col justify-center rounded-[9px] border px-3 transition-[border-color,background-color,box-shadow] duration-[var(--motion-duration-color)]",
                    exception.kind === "custom-hours"
                      ? "border-[#cfcfd3] bg-[#f8f8f9] shadow-[inset_0_0_0_1px_rgba(22,22,25,0.03)]"
                      : "border-[#e7e7e9] bg-white hover:border-[#d7d7da] hover:bg-[#fcfcfc]",
                  )}
                >
                  <input
                    aria-label="Custom hours"
                    type="radio"
                    className="sr-only"
                    checked={exception.kind === "custom-hours"}
                    onChange={() => setKind("custom-hours")}
                  />
                  <span className="text-[11px] font-medium text-[#404045]">Custom hours</span>
                  <span className="mt-0.5 text-[9px] leading-tight text-[#97989e]">
                    Use different hours for a single date
                  </span>
                </label>
              </div>
            </fieldset>

            {exception.kind === "closed" ? (
              <fieldset>
                <legend className="text-[10px] font-medium text-[#74757b]">Dates</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] text-[#98999f]">Start date</span>
                    <Input
                      aria-label="Start date"
                      type="date"
                      lang="en-CA"
                      dir="ltr"
                      value={exception.startsOn}
                      onChange={(e) => setException({ ...exception, startsOn: e.target.value })}
                      className="h-9 border-[#e3e3e6] bg-white px-2 text-[11px] shadow-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] text-[#98999f]">End date</span>
                    <Input
                      aria-label="End date"
                      type="date"
                      lang="en-CA"
                      dir="ltr"
                      value={exception.endsOn}
                      onChange={(e) => setException({ ...exception, endsOn: e.target.value })}
                      className="h-9 border-[#e3e3e6] bg-white px-2 text-[11px] shadow-none"
                    />
                  </label>
                </div>
              </fieldset>
            ) : (
              <fieldset>
                <legend className="text-[10px] font-medium text-[#74757b]">Working hours</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <label className="block sm:col-span-3">
                    <span className="mb-1.5 block text-[9px] text-[#98999f]">Date</span>
                    <Input
                      aria-label="Date"
                      type="date"
                      lang="en-CA"
                      dir="ltr"
                      value={exception.startsOn}
                      onChange={(e) =>
                        setException({
                          ...exception,
                          startsOn: e.target.value,
                          endsOn: e.target.value,
                        })
                      }
                      className="h-9 border-[#e3e3e6] bg-white px-2 text-[11px] shadow-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] text-[#98999f]">Opens</span>
                    <Input
                      aria-label="Thursday opening"
                      type="time"
                      step={1800}
                      dir="ltr"
                      value={exception.windows[0]?.startsAt || ""}
                      onChange={(e) =>
                        setException({
                          ...exception,
                          windows: [{ ...exception.windows[0], startsAt: e.target.value }],
                        })
                      }
                      className="h-9 border-[#e3e3e6] bg-white px-2 text-[11px] shadow-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] text-[#98999f]">Closes</span>
                    <Input
                      aria-label="Thursday closing"
                      type="time"
                      step={1800}
                      dir="ltr"
                      value={exception.windows[0]?.endsAt || ""}
                      onChange={(e) =>
                        setException({
                          ...exception,
                          windows: [{ ...exception.windows[0], endsAt: e.target.value }],
                        })
                      }
                      className="h-9 border-[#e3e3e6] bg-white px-2 text-[11px] shadow-none"
                    />
                  </label>
                </div>
              </fieldset>
            )}

            <label className="block">
              <span className="text-[10px] font-medium text-[#74757b]">Note</span>
              <span className="ml-1 text-[9px] text-[#a3a4a9]">Optional</span>
              <Textarea
                aria-label="Reason"
                value={exception.note}
                placeholder="E.g. travel, holiday, or a special appointment day"
                onChange={(e) => setException({ ...exception, note: e.target.value })}
                className="mt-2 min-h-20 resize-none border-[#e3e3e6] bg-white px-2.5 py-2 text-[11px] shadow-none placeholder:text-[#b2b3b8]"
              />
            </label>
          </div>
          <DialogFooter className="border-t border-[#eeeeef] bg-[#fcfcfc] px-5 py-3 sm:space-x-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="min-h-8 px-3 text-[10px] font-medium text-[#77787e] hover:bg-[#f0f0f1] hover:text-[#303034]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={saveException}
              className={cn(dashboardPrimaryButtonClassName, "min-h-8 px-3 text-[10px]")}
            >
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
