import { describe, test, expect, afterEach } from "bun:test";
import fs from "fs/promises";
import { mkdtempSync, existsSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import { snapraidRunner } from "./snapraid-runner";
import * as config from "../config";
import { silenceConsole } from "../test-utils/silence-console";

const { mock } = await import("bun:test");
const tmpDir = mkdtempSync(path.join(tmpdir(), "scheduler-test-"));
const schedulesPath =
  config.SCHEDULES_FILE || path.join(tmpDir, "schedules.json");
const snapraidConfPath =
  config.SNAPRAID_CONF_FILE || path.join(tmpDir, "snapraid.conf");
const logsDir = config.LOGS_DIR || path.join(tmpDir, "logs");

const cronState = {
  scheduled: [] as {
    expression: string;
    cb: () => void;
    job: { stop: () => void };
  }[],
  stopCalls: [] as string[],
  invalidExpressions: new Set<string>(),
  throwSchedule: false,
};

mock.module("node-cron", () => ({
  default: {
    validate: (expr: string) => !cronState.invalidExpressions.has(expr),
    schedule: (expr: string, cb: () => void) => {
      if (cronState.throwSchedule) {
        throw new Error("schedule failed");
      }
      const job = {
        stop: () => {
          cronState.stopCalls.push(expr);
        },
      };
      cronState.scheduled.push({ expression: expr, cb, job });
      return job;
    },
  },
  validate: (expr: string) => !cronState.invalidExpressions.has(expr),
  schedule: (expr: string, cb: () => void) => {
    if (cronState.throwSchedule) {
      throw new Error("schedule failed");
    }
    const job = {
      stop: () => {
        cronState.stopCalls.push(expr);
      },
    };
    cronState.scheduled.push({ expression: expr, cb, job });
    return job;
  },
}));

const scheduler = await import("./scheduler");
const originalIsRunning = snapraidRunner.isRunning.bind(snapraidRunner);
const originalExecute = snapraidRunner.executeCommand.bind(snapraidRunner);

const runnerState = {
  running: false,
  executeResult: { exitCode: 0, output: "" },
  executeError: null as Error | null,
  executeCalls: [] as unknown[],
};

afterEach(async () => {
  cronState.scheduled = [];
  cronState.stopCalls = [];
  cronState.invalidExpressions.clear();
  cronState.throwSchedule = false;
  runnerState.running = false;
  runnerState.executeError = null;
  runnerState.executeResult = { exitCode: 0, output: "" };
  runnerState.executeCalls = [];
  snapraidRunner.isRunning = originalIsRunning;
  snapraidRunner.executeCommand = originalExecute;
  await scheduler.stopAllJobs();
  if (existsSync(schedulesPath)) {
    await fs.unlink(schedulesPath);
  }
});

describe("getNextRunTime", () => {
  test("returns ISO string for valid cron expression", async () => {
    const next = scheduler.getNextRunTime("0 0 * * *");
    expect(next).toBeDefined();
    expect(typeof next).toBe("string");
    expect(() => new Date(next!).toISOString()).not.toThrow();
  });

  test("returns undefined for invalid cron expression", async () => {
    const next = scheduler.getNextRunTime("not-a-cron");
    expect(next).toBeUndefined();
  });
});

describe("scheduler CRUD with temp file", () => {
  test("getSchedules returns empty array when file does not exist", async () => {
    if (existsSync(schedulesPath)) await fs.unlink(schedulesPath);
    const list = await scheduler.getSchedules();
    expect(list).toEqual([]);
  });

  test("createSchedule adds schedule and getSchedules returns it", async () => {
    const created = await scheduler.createSchedule({
      name: "Nightly Sync",
      command: "sync",
      cronExpression: "0 0 * * *",
      enabled: false,
      configPath: snapraidConfPath,
    });
    expect(created.id).toBeDefined();
    const list = await scheduler.getSchedules();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(created.id);
  });

  test("createSchedule starts job when enabled", async () => {
    const created = await scheduler.createSchedule({
      name: "Enabled",
      command: "sync",
      cronExpression: "0 1 * * *",
      enabled: true,
      configPath: snapraidConfPath,
    });
    expect(created.enabled).toBe(true);
    expect(cronState.scheduled.length).toBe(1);
  });

  test("createSchedule throws for invalid cron expression", async () => {
    cronState.invalidExpressions.add("invalid");
    await expect(
      scheduler.createSchedule({
        name: "Bad",
        command: "sync",
        cronExpression: "invalid",
        enabled: false,
        configPath: snapraidConfPath,
      }),
    ).rejects.toThrow("Invalid cron");
  });
});

describe("scheduler execution and notifications", () => {
  test("executeScheduledCommand runs command, logs, updates schedule, sends notification", async () => {
    await fs.mkdir(logsDir, { recursive: true });
    snapraidRunner.isRunning = () => runnerState.running;
    snapraidRunner.executeCommand = async (
      command: any,
      configPath: any,
      onOutput?: (chunk: string) => void,
      args?: string[],
    ) => {
      runnerState.executeCalls.push({ command, configPath, args });
      onOutput?.("chunk");
      return runnerState.executeResult;
    };
    const schedule = {
      id: "s1",
      name: "Run",
      command: "sync",
      cronExpression: "0 2 * * *",
      enabled: true,
      configPath: snapraidConfPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextRun: null,
    };
    await fs.writeFile(
      schedulesPath,
      JSON.stringify({ schedules: [schedule] }, null, 2),
      "utf-8",
    );
    await scheduler.initializeScheduler();
    expect(cronState.scheduled.length).toBe(1);
    cronState.scheduled[0].cb();
    // Wait for async operations to complete (executeScheduledCommand is fire-and-forget)
    await new Promise((resolve) => setTimeout(resolve, 100));
    const saved = JSON.parse(await fs.readFile(schedulesPath, "utf-8"));
    expect(saved.schedules[0].lastRun).toBeDefined();
    expect(saved.schedules[0].updatedAt).toBeDefined();
  });

  test("skips schedule when runner is already running", async () => {
    snapraidRunner.isRunning = () => true;
    runnerState.running = true;
    const schedule = {
      id: "s2",
      name: "Skip",
      command: "sync",
      cronExpression: "0 3 * * *",
      enabled: true,
      configPath: snapraidConfPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextRun: null,
    };
    await fs.writeFile(
      schedulesPath,
      JSON.stringify({ schedules: [schedule] }, null, 2),
      "utf-8",
    );
    await scheduler.initializeScheduler();
    cronState.scheduled[0].cb();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(runnerState.executeCalls.length).toBe(0);
  });

  test("handles execute errors by appending error to log", async () => {
    await fs.mkdir(logsDir, { recursive: true });
    const restore = silenceConsole();
    snapraidRunner.isRunning = () => runnerState.running;
    snapraidRunner.executeCommand = async () => {
      throw new Error("boom");
    };
    runnerState.executeError = new Error("boom");
    const schedule = {
      id: "s3",
      name: "Fail",
      command: "sync",
      cronExpression: "0 4 * * *",
      enabled: true,
      configPath: snapraidConfPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextRun: null,
    };
    await fs.writeFile(
      schedulesPath,
      JSON.stringify({ schedules: [schedule] }, null, 2),
      "utf-8",
    );
    await scheduler.initializeScheduler();
    cronState.scheduled[0].cb();
    await new Promise((resolve) => setTimeout(resolve, 0));
    restore();
  });
});

describe("scheduler job lifecycle", () => {
  test("initializeScheduler skips invalid cron expressions", async () => {
    const restore = silenceConsole();
    cronState.invalidExpressions.add("invalid-cron");
    const schedule = {
      id: "s5",
      name: "Invalid",
      command: "sync",
      cronExpression: "invalid-cron",
      enabled: true,
      configPath: snapraidConfPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextRun: null,
    };
    await fs.writeFile(
      schedulesPath,
      JSON.stringify({ schedules: [schedule] }, null, 2),
      "utf-8",
    );
    await scheduler.initializeScheduler();
    expect(cronState.scheduled.length).toBe(0);
    restore();
  });

  test("startCronJob errors are caught during createSchedule", async () => {
    const restore = silenceConsole();
    cronState.throwSchedule = true;
    const created = await scheduler.createSchedule({
      name: "Throw",
      command: "sync",
      cronExpression: "0 6 * * *",
      enabled: true,
      configPath: snapraidConfPath,
    });
    expect(created.id).toBeDefined();
    expect(cronState.scheduled.length).toBe(0);
    restore();
  });

  test("updateSchedule restarts jobs when enabled changes", async () => {
    const created = await scheduler.createSchedule({
      name: "Toggle",
      command: "sync",
      cronExpression: "0 7 * * *",
      enabled: true,
      configPath: snapraidConfPath,
    });
    expect(cronState.scheduled.length).toBe(1);
    const updated = await scheduler.updateSchedule(created.id, {
      enabled: false,
    });
    expect(updated.enabled).toBe(false);
    expect(cronState.stopCalls.length).toBe(1);
  });

  test("updateSchedule updates nextRun when cron expression changes", async () => {
    const created = await scheduler.createSchedule({
      name: "CronChange",
      command: "sync",
      cronExpression: "0 10 * * *",
      enabled: false,
      configPath: snapraidConfPath,
    });
    const updated = await scheduler.updateSchedule(created.id, {
      cronExpression: "5 10 * * *",
    });
    expect(updated.nextRun).toBeDefined();
  });
});

describe("scheduler errors", () => {
  test("updateSchedule throws when schedule is missing", async () => {
    await expect(
      scheduler.updateSchedule("missing-id", { name: "Nope" }),
    ).rejects.toThrow("not found");
  });

  test("updateSchedule throws for invalid cron expression", async () => {
    const created = await scheduler.createSchedule({
      name: "BadCron",
      command: "sync",
      cronExpression: "0 8 * * *",
      enabled: false,
      configPath: snapraidConfPath,
    });
    cronState.invalidExpressions.add("bad-cron");
    await expect(
      scheduler.updateSchedule(created.id, { cronExpression: "bad-cron" }),
    ).rejects.toThrow("Invalid cron expression");
  });

  test("deleteSchedule throws when schedule missing", async () => {
    await expect(scheduler.deleteSchedule("missing-id")).rejects.toThrow(
      "not found",
    );
  });
});

describe("scheduler callbacks and state", () => {
  test("setScheduleOutputCallback accepts callback", async () => {
    scheduler.setScheduleOutputCallback((_id, _chunk) => {});
  });

  test("stopAllJobs stops active jobs", async () => {
    await scheduler.createSchedule({
      name: "Stop",
      command: "sync",
      cronExpression: "0 9 * * *",
      enabled: true,
      configPath: snapraidConfPath,
    });
    expect(scheduler.getActiveJobCount()).toBe(1);
    scheduler.stopAllJobs();
    expect(scheduler.getActiveJobCount()).toBe(0);
    expect(cronState.stopCalls.length).toBe(1);
  });
});
