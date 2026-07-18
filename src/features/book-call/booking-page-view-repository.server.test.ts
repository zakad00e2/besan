import { describe, expect, it, vi } from "vitest";
import type { QueryExecutor } from "./booking-repository.server";
import { createBookingPageViewRepository } from "./booking-page-view-repository.server";

describe("booking page view repository", () => {
  it("reads the stored checkpoint and a server snapshot", async () => {
    const execute = vi
      .fn<QueryExecutor>()
      .mockResolvedValueOnce([{ last_seen_at: "2026-07-17T08:00:00.000Z" }])
      .mockResolvedValueOnce([{ snapshot_at: "2026-07-17T09:00:00.000Z" }]);
    const repository = createBookingPageViewRepository(execute);

    await expect(repository.getLastSeen("supervisor-1")).resolves.toBe(
      "2026-07-17T08:00:00.000Z",
    );
    await expect(repository.getSnapshotAt()).resolves.toBe("2026-07-17T09:00:00.000Z");
    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("WHERE supervisor_id = $1"),
      ["supervisor-1"],
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\""),
    );
  });

  it("upserts a monotonic checkpoint", async () => {
    const execute = vi.fn<QueryExecutor>().mockResolvedValue([]);

    await createBookingPageViewRepository(execute).saveLastSeen(
      "supervisor-1",
      "2026-07-17T09:00:00.000Z",
    );

    expect(execute).toHaveBeenCalledWith(
      expect.stringMatching(/ON CONFLICT \(supervisor_id\)[\s\S]+GREATEST/),
      ["supervisor-1", "2026-07-17T09:00:00.000Z"],
    );
  });
});
