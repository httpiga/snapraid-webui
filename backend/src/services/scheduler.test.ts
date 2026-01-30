import { describe, test, expect, beforeAll, afterEach } from "bun:test";
import fs from "fs/promises";
import { mkdtempSync, existsSync } from "fs";
import path from "path";
import { tmpdir } from "os";

describe("getNextRunTime", () => {
  test("returns ISO string for valid cron expression", async () => {
    const { getNextRunTime } = await import("./scheduler");
    const next = getNextRunTime("0 0 * * *");
    expect(next).toBeDefined();
    expect(typeof next).toBe("string");
    expect(() => new Date(next!).toISOString()).not.toThrow();
  });

  test("returns undefined for invalid cron expression", async () => {
    const { getNextRunTime } = await import("./scheduler");
    expect(getNextRunTime("not-a-cron")).toBeUndefined();
    expect(getNextRunTime("99 99 * * *")).toBeUndefined();
  });

  test("every minute returns a time within next minute", async () => {
    const { getNextRunTime } = await import("./scheduler");
    const next = getNextRunTime("* * * * *");
    expect(next).toBeDefined();
    const nextDate = new Date(next!);
    const now = new Date();
    const diffMs = nextDate.getTime() - now.getTime();
    expect(diffMs).toBeGreaterThan(0);
    expect(diffMs).toBeLessThanOrEqual(60_000);
  });
});

describe("scheduler CRUD with temp file", () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), "scheduler-test-"));
  const schedulesPath = path.join(tmpDir, "scheduleson");
  let scheduler: Awaited<typeof import("./scheduler")>;

  beforeAll(async () => {
    const { mock } = await import("bun:test");
    const realConfig = await import("../config");
    mock.module("../config", () => ({
      CONFIG_PATH: realConfig.CONFIG_PATH,
      PORT: realConfig.PORT,
      APP_CONFIG_FILE: realConfig.APP_CONFIG_FILE,
      SCHEDULES_FILE: schedulesPath,
      SNAPRAID_CONF_FILE: path.join(tmpDir, "snapraid.conf"),
      LOGS_DIR: realConfig.LOGS_DIR,
      SNAPRAID_BIN: realConfig.SNAPRAID_BIN,
    }));
    mock.module("./snapraid-runner", () => ({
      snapraidRunner: {
        isRunning: () => false,
        executeCommand: () => Promise.resolve({ exitCode: 0, output: "" }),
      },
    }));
    mock.module("../routes/logs", () => ({
      createLogFile: () => Promise.resolve("sync-2024-01-01T00-00-00.log"),
      appendToLogFile: () => Promise.resolve(),
    }));
    const realNotifications = await import("./notifications/index");
    mock.module("./notifications/index", () => ({
      ...realNotifications,
      sendNotification: () =>
        Promise.resolve({
          success: false,
          results: {
            discord: false,
            telegram: false,
            email: false,
            slack: false,
          },
        }),
    }));
    scheduler = await import("./scheduler");
  });

  afterEach(() => {
    scheduler.stopAllJobs();
  });

  test("getSchedules returns empty array when file does not exist", async () => {
    if (existsSync(schedulesPath)) await fs.unlink(schedulesPath);
    const list = await scheduler.getSchedules();
    expect(list).toEqual([]);
  });

  test("createSchedule adds schedule and getSchedules returns it", async () => {
    if (existsSync(schedulesPath)) await fs.unlink(schedulesPath);
    const created = await scheduler.createSchedule({
      name: "Nightly Sync",
      command: "sync",
      cronExpression: "0 0 * * *",
      enabled: false,
      configPath: path.join(tmpDir, "snapraid.conf"),
    });
    expect(created.id).toBeDefined();
    expect(created.name).toBe("Nightly Sync");
    expect(created.command).toBe("sync");
    expect(created.cronExpression).toBe("0 0 * * *");
    expect(created.enabled).toBe(false);
    expect(created.nextRun).toBeDefined();

    const list = await scheduler.getSchedules();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(created.id);
    expect(list[0].name).toBe("Nightly Sync");
  });

  test("getSchedule returns schedule by id", async () => {
    const created = await scheduler.createSchedule({
      name: "Get Test",
      command: "scrub",
      cronExpression: "0 1 * * *",
      enabled: false,
      configPath: path.join(tmpDir, "snapraid.conf"),
    });
    const found = await scheduler.getSchedule(created.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe("Get Test");
  });

  test("getSchedule returns undefined for unknown id", async () => {
    const found = await scheduler.getSchedule("nonexistent-id");
    expect(found).toBeUndefined();
  });

  test("updateSchedule updates schedule", async () => {
    const created = await scheduler.createSchedule({
      name: "Original",
      command: "sync",
      cronExpression: "0 2 * * *",
      enabled: false,
      configPath: path.join(tmpDir, "snapraid.conf"),
    });
    const updated = await scheduler.updateSchedule(created.id, {
      name: "Updated Name",
    });
    expect(updated.name).toBe("Updated Name");
    expect(updated.id).toBe(created.id);
    const list = await scheduler.getSchedules();
    const inList = list.find((s) => s.id === created.id);
    expect(inList?.name).toBe("Updated Name");
  });

  test("deleteSchedule removes schedule", async () => {
    const created = await scheduler.createSchedule({
      name: "To Delete",
      command: "check",
      cronExpression: "0 3 * * *",
      enabled: false,
      configPath: path.join(tmpDir, "snapraid.conf"),
    });
    await scheduler.deleteSchedule(created.id);
    const found = await scheduler.getSchedule(created.id);
    expect(found).toBeUndefined();
  });

  test("createSchedule throws for invalid cron expression", async () => {
    await expect(
      scheduler.createSchedule({
        name: "Bad",
        command: "sync",
        cronExpression: "invalid",
        enabled: false,
        configPath: path.join(tmpDir, "snapraid.conf"),
      })
    ).rejects.toThrow("Invalid cron");
  });
});

describe("scheduler callbacks and state", () => {
  test("setScheduleOutputCallback accepts callback", async () => {
    const { setScheduleOutputCallback } = await import("./scheduler");
    setScheduleOutputCallback((_id, _chunk) => {});
  });

  test("getActiveJobCount returns number", async () => {
    const { getActiveJobCount } = await import("./scheduler");
    const n = getActiveJobCount();
    expect(typeof n).toBe("number");
    expect(n).toBeGreaterThanOrEqual(0);
  });

  test("stopAllJobs clears jobs", async () => {
    const { stopAllJobs, getActiveJobCount } = await import("./scheduler");
    stopAllJobs();
    expect(getActiveJobCount()).toBe(0);
  });
});
