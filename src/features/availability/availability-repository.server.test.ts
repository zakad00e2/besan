import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_WEEKLY_SCHEDULE } from "./availability-domain";
import {
  createAvailabilityRepository,
  type AvailabilityQueryExecutor,
} from "./availability-repository.server";

const configurationRow = {
  timezone: "Asia/Jerusalem",
  slot_duration_minutes: 60,
  weekly: DEFAULT_WEEKLY_SCHEDULE,
  overrides: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      kind: "closed",
      startsOn: "2026-08-10",
      endsOn: "2026-08-20",
      note: "Travel",
      windows: [],
    },
  ],
};

describe("availability repository", () => {
  it("does not import Node crypto into client-reachable server functions", () => {
    const source = readFileSync(
      "src/features/availability/availability-repository.server.ts",
      "utf8",
    );

    expect(source).not.toContain('from "node:crypto"');
  });

  it("loads one normalized configuration", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([configurationRow]);
    await expect(createAvailabilityRepository(execute).loadConfiguration()).resolves.toEqual({
      timezone: "Asia/Jerusalem",
      slotDurationMinutes: 60,
      weekly: DEFAULT_WEEKLY_SCHEDULE,
      overrides: configurationRow.overrides,
    });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("weekly_availability_days"));
  });

  it("does not use PostgreSQL reserved window aliases", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([configurationRow]);
    const transaction = vi
      .fn()
      .mockResolvedValue([[], [{ id: "11111111-1111-4111-8111-111111111111" }], []]);
    execute.transaction = transaction;
    const repository = createAvailabilityRepository(execute);

    await repository.loadConfiguration();
    await repository.replaceWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
    await repository.saveOverride({
      kind: "custom-hours",
      startsOn: "2026-07-16",
      endsOn: "2026-07-16",
      note: "Thursday opening",
      windows: [{ startsAt: "11:30", endsAt: "13:30" }],
    });

    const directQueries = execute.mock.calls.map(([query]) => query);
    const transactionQueries = transaction.mock.calls[0][0].map(
      ({ query }: { query: string }) => query,
    );
    expect([...directQueries, ...transactionQueries].join("\n")).not.toMatch(/\bwindow\./);
  });

  it("lists active occupied appointments in an inclusive range", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([
      {
        id: "appointment-1",
        appointment_date: "2026-07-19",
        appointment_time: "12:30",
        status: "confirmed",
      },
    ]);
    await expect(
      createAvailabilityRepository(execute).listOccupiedAppointments("2026-07-01", "2026-07-31"),
    ).resolves.toEqual([
      {
        id: "appointment-1",
        date: "2026-07-19",
        startsAt: "12:30",
        status: "confirmed",
      },
    ]);
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("status <> 'cancelled'"), [
      "2026-07-01",
      "2026-07-31",
    ]);
  });

  it("replaces all seven weekly days and windows in one statement", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([]);
    await createAvailabilityRepository(execute).replaceWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(
      expect.stringMatching(
        /UPDATE public\.weekly_availability_days[\s\S]+DELETE FROM public\.weekly_availability_windows[\s\S]+INSERT INTO public\.weekly_availability_windows/,
      ),
      [JSON.stringify(DEFAULT_WEEKLY_SCHEDULE)],
    );
  });

  it("upserts an override and its windows atomically", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
      },
    ]);
    const transaction = vi
      .fn()
      .mockResolvedValue([[], [{ id: "11111111-1111-4111-8111-111111111111" }], []]);
    execute.transaction = transaction;
    const input = {
      kind: "custom-hours" as const,
      startsOn: "2026-07-16",
      endsOn: "2026-07-16",
      note: "Thursday opening",
      windows: [{ startsAt: "11:30", endsAt: "13:30" }],
    };
    await expect(createAvailabilityRepository(execute).saveOverride(input)).resolves.toEqual({
      success: true,
      id: "11111111-1111-4111-8111-111111111111",
    });
    expect(transaction).toHaveBeenCalledOnce();
  });

  it("saves an override through the documented one-argument factory", async () => {
    const overrideId = "11111111-1111-4111-8111-111111111111";
    const execute = vi.fn<AvailabilityQueryExecutor>().mockImplementation(async (query) => {
      if (query.includes("INSERT INTO public.availability_date_overrides")) {
        return [{ id: overrideId }];
      }
      return [];
    });

    await expect(
      createAvailabilityRepository(execute).saveOverride({
        kind: "custom-hours",
        startsOn: "2026-07-16",
        endsOn: "2026-07-16",
        note: "Thursday opening",
        windows: [{ startsAt: "11:30", endsAt: "13:30" }],
      }),
    ).resolves.toEqual({ success: true, id: overrideId });
  });

  it("removes custom-hour windows before changing an override to closed", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>();
    const transaction = vi
      .fn()
      .mockResolvedValue([
        [{ id: "window-1" }],
        [{ id: "11111111-1111-4111-8111-111111111111" }],
        [],
      ]);
    execute.transaction = transaction;
    await expect(
      createAvailabilityRepository(execute).saveOverride({
        id: "11111111-1111-4111-8111-111111111111",
        kind: "closed",
        startsOn: "2026-07-16",
        endsOn: "2026-07-16",
        note: "Closed for repairs",
        windows: [],
      }),
    ).resolves.toEqual({ success: true, id: "11111111-1111-4111-8111-111111111111" });

    expect(transaction).toHaveBeenCalledWith([
      expect.objectContaining({
        query: expect.stringContaining("DELETE FROM public.availability_date_windows"),
        params: ["11111111-1111-4111-8111-111111111111"],
      }),
      expect.objectContaining({
        query: expect.stringContaining("INSERT INTO public.availability_date_overrides"),
        params: [
          "11111111-1111-4111-8111-111111111111",
          "closed",
          "2026-07-16",
          "2026-07-16",
          "Closed for repairs",
        ],
      }),
      expect.objectContaining({
        query: expect.stringContaining("INSERT INTO public.availability_date_windows"),
        params: ["11111111-1111-4111-8111-111111111111", "[]"],
      }),
    ]);
  });

  it("maps a concurrent override-range conflict", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>();
    const transaction = vi.fn().mockRejectedValue({
      code: "23P01",
      constraint: "availability_date_overrides_no_overlap",
    });
    execute.transaction = transaction;
    await expect(
      createAvailabilityRepository(execute).saveOverride({
        kind: "closed",
        startsOn: "2026-08-10",
        endsOn: "2026-08-20",
        note: "Travel",
        windows: [],
      }),
    ).resolves.toEqual({ success: false, reason: "overlap" });
  });

  it("deletes an override without touching appointments", async () => {
    const execute = vi.fn<AvailabilityQueryExecutor>().mockResolvedValue([{ id: "override-1" }]);
    await expect(createAvailabilityRepository(execute).deleteOverride("override-1")).resolves.toBe(
      true,
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM public\.availability_date_overrides/),
      ["override-1"],
    );
  });
});
