import { describe, expect, it, vi } from "vitest";
import type { WorkshopBookingListItem } from "@/features/workshop-booking/workshop-booking";
import {
  changeWorkshopBookingStatusForAdmin,
  listWorkshopBookingsForAdmin,
} from "./admin.functions";

const booking: WorkshopBookingListItem = {
  id: "workshop-booking-1",
  workshopId: "mini-course",
  workshopName: "Private mini course",
  fullName: "Noor Al-Hashemi",
  mobile: "+970591234567",
  email: "noor@example.com",
  date: "2026-07-13",
  participants: 3,
  notes: "Vegetarian lunch",
  status: "pending",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
};

function dependencies(allowed = true) {
  return {
    verifyAdminToken: vi.fn().mockResolvedValue({ allowed }),
    repository: {
      list: vi.fn().mockResolvedValue([booking]),
      updateStatus: vi.fn().mockResolvedValue({ success: true, booking }),
    },
  };
}

describe("workshop booking admin functions", () => {
  it("does not list workshop bookings for a forbidden token", async () => {
    const testDependencies = dependencies(false);

    await expect(listWorkshopBookingsForAdmin("invalid-token", testDependencies)).resolves.toEqual({
      success: false,
      reason: "forbidden",
    });
    expect(testDependencies.repository.list).not.toHaveBeenCalled();
  });

  it("lists workshop bookings after verifying an admin token", async () => {
    const testDependencies = dependencies();

    await expect(listWorkshopBookingsForAdmin("admin-token", testDependencies)).resolves.toEqual({
      success: true,
      bookings: [booking],
    });
    expect(testDependencies.repository.list).toHaveBeenCalledOnce();
  });

  it("maps repository listing failures to load-error", async () => {
    const testDependencies = dependencies();
    testDependencies.repository.list.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(listWorkshopBookingsForAdmin("admin-token", testDependencies)).resolves.toEqual({
      success: false,
      reason: "load-error",
    });
  });

  it("does not update when an admin token is forbidden", async () => {
    const testDependencies = dependencies(false);

    await expect(
      changeWorkshopBookingStatusForAdmin(
        { token: "invalid-token", id: booking.id, status: "confirmed" },
        testDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "forbidden" });
    expect(testDependencies.repository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects invalid status values before updating a booking", async () => {
    const testDependencies = dependencies();

    await expect(
      changeWorkshopBookingStatusForAdmin(
        { token: "admin-token", id: booking.id, status: "refunded" },
        testDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "invalid-status" });
    expect(testDependencies.verifyAdminToken).toHaveBeenCalledWith("admin-token");
    expect(testDependencies.repository.updateStatus).not.toHaveBeenCalled();
  });

  it("returns not-found when no workshop booking is updated", async () => {
    const testDependencies = dependencies();
    testDependencies.repository.updateStatus.mockResolvedValueOnce({
      success: false,
      reason: "not-found",
    });

    await expect(
      changeWorkshopBookingStatusForAdmin(
        { token: "admin-token", id: booking.id, status: "confirmed" },
        testDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "not-found" });
  });

  it("maps repository update failures to update-error", async () => {
    const testDependencies = dependencies();
    testDependencies.repository.updateStatus.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    await expect(
      changeWorkshopBookingStatusForAdmin(
        { token: "admin-token", id: booking.id, status: "confirmed" },
        testDependencies,
      ),
    ).resolves.toEqual({ success: false, reason: "update-error" });
  });
});
