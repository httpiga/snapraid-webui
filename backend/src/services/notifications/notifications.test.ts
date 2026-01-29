import { describe, test, expect } from "bun:test";
import { getOperationNotificationPayload } from "./index.js";

describe("getOperationNotificationPayload", () => {
  test("returns null for check command", () => {
    expect(getOperationNotificationPayload("check", 0)).toBeNull();
    expect(getOperationNotificationPayload("check", 1)).toBeNull();
  });

  test("returns null for fix command", () => {
    expect(getOperationNotificationPayload("fix", 0)).toBeNull();
  });

  test("sync exit 0 returns sync_complete", () => {
    const payload = getOperationNotificationPayload("sync", 0);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("sync_complete");
    expect(payload!.title).toBe("Sync completed");
    expect(payload!.message).toContain("successfully");
    expect(payload!.details.Command).toBe("sync");
    expect(payload!.details["Exit code"]).toBe("0");
    expect(payload!.details.Source).toBe("Manual");
  });

  test("sync exit 0 with schedule name includes schedule in details", () => {
    const payload = getOperationNotificationPayload("sync", 0, {
      scheduleName: "Nightly Sync",
    });
    expect(payload).not.toBeNull();
    expect(payload!.details.Source).toBe("Scheduled: Nightly Sync");
  });

  test("sync non-zero exit returns sync_error", () => {
    const payload = getOperationNotificationPayload("sync", 1);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("sync_error");
    expect(payload!.title).toBe("Sync failed");
    expect(payload!.message).toContain("exit code 1");
  });

  test("sync aborted by SIGTERM returns sync_aborted", () => {
    const sigterm = 128 + 15;
    const payload = getOperationNotificationPayload("sync", sigterm);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("sync_aborted");
    expect(payload!.title).toBe("Sync aborted");
  });

  test("sync aborted by SIGINT returns sync_aborted", () => {
    const sigint = 128 + 2;
    const payload = getOperationNotificationPayload("sync", sigint);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("sync_aborted");
  });

  test("scrub exit 0 returns scrub_complete", () => {
    const payload = getOperationNotificationPayload("scrub", 0);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("scrub_complete");
    expect(payload!.title).toBe("Scrub completed");
  });

  test("scrub non-zero returns scrub_error", () => {
    const payload = getOperationNotificationPayload("scrub", 2);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("scrub_error");
    expect(payload!.title).toBe("Scrub failed");
  });

  test("scrub SIGTERM returns scrub_error with aborted message", () => {
    const payload = getOperationNotificationPayload("scrub", 128 + 15);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("scrub_error");
    expect(payload!.title).toBe("Scrub aborted");
  });
});
