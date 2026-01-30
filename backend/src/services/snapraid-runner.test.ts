import { describe, test, expect, mock, beforeAll } from "bun:test";
import * as realConfig from "../config";
import { SnapRaidRunner } from "./snapraid-runner";

describe("SnapRaidRunner", () => {
  let runner: SnapRaidRunner;

  beforeAll(() => {
    runner = new SnapRaidRunner();
  });

  test("isRunning returns false when no command running", () => {
    expect(runner.isRunning()).toBe(false);
  });

  test("getCurrentJob returns null when no command running", () => {
    expect(runner.getCurrentJob()).toBeNull();
  });

  test("abort returns false when no command running", () => {
    expect(runner.abort()).toBe(false);
  });
});

describe("SnapRaidRunner executeCommand with mocked spawn", () => {
  test("executeCommand resolves with output and exit code", async () => {
    const { mock } = await import("bun:test");
    const spawnCalls: [string, string[], object][] = [];
    mock.module("child_process", () => ({
      spawn: (bin: string, args: string[], opts: object) => {
        spawnCalls.push([bin, args, opts]);
        return {
          pid: 12345,
          stdout: {
            on: (_ev: string, cb: (data: Buffer) => void) => {
              setImmediate(() => {
                const data = Buffer.from(
                  "status line 1\nNo sync is in progress.\n"
                );
                cb(data);
              });
            },
          },
          stderr: { on: () => {} },
          on: (_ev: string, cb: (code?: number) => void) => {
            setImmediate(() => cb(0));
            return {};
          },
          kill: () => {},
        };
      },
    }));
    mock.module("../config", () => ({
      CONFIG_PATH: realConfig.CONFIG_PATH,
      PORT: realConfig.PORT,
      APP_CONFIG_FILE: realConfig.APP_CONFIG_FILE,
      SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
      SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
      LOGS_DIR: realConfig.LOGS_DIR,
      SNAPRAID_BIN: "snapraid",
    }));

    const { SnapRaidRunner: Runner } = await import("./snapraid-runner");
    const runner = new Runner();
    const result = await runner.executeCommand(
      "status",
      "/tmp/config/snapraid.conf"
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("status line 1");
    expect(result.output).toContain("No sync is in progress");
    expect(runner.isRunning()).toBe(false);
    expect(spawnCalls.length).toBe(1);
    expect(spawnCalls[0][0]).toBe("snapraid");
    expect(spawnCalls[0][1]).toEqual(
      expect.arrayContaining(["-c", "/tmp/config/snapraid.conf", "status"])
    );
  });

  test("executeCommand calls onOutput callback with chunks", async () => {
    const { mock } = await import("bun:test");
    const chunks: string[] = [];
    mock.module("child_process", () => ({
      spawn: () => {
        const fakeProcess = {
          pid: 1,
          stdout: {
            on: (_: string, cb: (data: Buffer) => void) => {
              setImmediate(() => cb(Buffer.from("chunk1")));
              setImmediate(() => cb(Buffer.from("chunk2")));
            },
          },
          stderr: { on: () => {} },
          on: (_: string, cb: (code?: number) => void) => {
            setImmediate(() => cb(0));
            return fakeProcess;
          },
          kill: () => {},
        };
        return fakeProcess;
      },
    }));
    mock.module("../config", () => ({
      CONFIG_PATH: realConfig.CONFIG_PATH,
      PORT: realConfig.PORT,
      APP_CONFIG_FILE: realConfig.APP_CONFIG_FILE,
      SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
      SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
      LOGS_DIR: realConfig.LOGS_DIR,
      SNAPRAID_BIN: "snapraid",
    }));

    const { SnapRaidRunner: Runner } = await import("./snapraid-runner");
    const runner = new Runner();
    await runner.executeCommand("status", "/x/y.conf", (chunk) =>
      chunks.push(chunk)
    );

    expect(chunks).toContain("chunk1");
    expect(chunks).toContain("chunk2");
  });

  test("getStatus returns parsed SnapRaidStatus", async () => {
    const { mock } = await import("bun:test");
    mock.module("child_process", () => ({
      spawn: () => ({
        pid: 1,
        stdout: {
          on: (_: string, cb: (data: Buffer) => void) => {
            setImmediate(() =>
              cb(
                Buffer.from(
                  "No sync is in progress.\n 12345 files\n 500.5 GB\n"
                )
              )
            );
          },
        },
        stderr: { on: () => {} },
        on: (_: string, cb: (code?: number) => void) => {
          setImmediate(() => cb(0));
          return {};
        },
        kill: () => {},
      }),
    }));
    mock.module("../config", () => ({
      CONFIG_PATH: realConfig.CONFIG_PATH,
      PORT: realConfig.PORT,
      APP_CONFIG_FILE: realConfig.APP_CONFIG_FILE,
      SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
      SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
      LOGS_DIR: realConfig.LOGS_DIR,
      SNAPRAID_BIN: "snapraid",
    }));

    const { SnapRaidRunner: Runner } = await import("./snapraid-runner");
    const runner = new Runner();
    const status = await runner.getStatus("/a/b.conf");

    expect(status.parityUpToDate).toBe(true);
    expect(status.totalFiles).toBe(12345);
    expect(status.totalUsedGB).toBe(500.5);
  });

  test("runSync passes preHash and forceEmpty args", async () => {
    const { mock } = await import("bun:test");
    let capturedArgs: string[] = [];
    mock.module("child_process", () => ({
      spawn: (_: string, args: string[]) => {
        capturedArgs = args;
        return {
          pid: 1,
          stdout: { on: () => {} },
          stderr: { on: () => {} },
          on: (_: string, cb: (code?: number) => void) => {
            setImmediate(() => cb(0));
            return {};
          },
          kill: () => {},
        };
      },
    }));
    mock.module("../config", () => ({
      CONFIG_PATH: realConfig.CONFIG_PATH,
      PORT: realConfig.PORT,
      APP_CONFIG_FILE: realConfig.APP_CONFIG_FILE,
      SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
      SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
      LOGS_DIR: realConfig.LOGS_DIR,
      SNAPRAID_BIN: "snapraid",
    }));

    const { SnapRaidRunner: Runner } = await import("./snapraid-runner");
    const runner = new Runner();
    await runner.runSync("/a/b.conf", undefined, {
      preHash: true,
      forceEmpty: true,
    });

    expect(capturedArgs).toContain("--pre-hash");
    expect(capturedArgs).toContain("--force-empty");
    expect(capturedArgs).toContain("sync");
  });

  test("runScrub passes plan and olderThan", async () => {
    const { mock } = await import("bun:test");
    let capturedArgs: string[] = [];
    mock.module("child_process", () => ({
      spawn: (_: string, args: string[]) => {
        capturedArgs = args;
        return {
          pid: 1,
          stdout: { on: () => {} },
          stderr: { on: () => {} },
          on: (_: string, cb: (code?: number) => void) => {
            setImmediate(() => cb(0));
            return {};
          },
          kill: () => {},
        };
      },
    }));
    mock.module("../config", () => ({
      CONFIG_PATH: realConfig.CONFIG_PATH,
      PORT: realConfig.PORT,
      APP_CONFIG_FILE: realConfig.APP_CONFIG_FILE,
      SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
      SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
      LOGS_DIR: realConfig.LOGS_DIR,
      SNAPRAID_BIN: "snapraid",
    }));

    const { SnapRaidRunner: Runner } = await import("./snapraid-runner");
    const runner = new Runner();
    await runner.runScrub("/a/b.conf", undefined, { plan: 10, olderThan: 7 });

    expect(capturedArgs).toContain("-p");
    expect(capturedArgs).toContain("10");
    expect(capturedArgs).toContain("-o");
    expect(capturedArgs).toContain("7");
  });

  test("executeCommand throws when another command is already running", async () => {
    const { mock } = await import("bun:test");
    mock.module("child_process", () => ({
      spawn: () => ({
        pid: 1,
        stdout: { on: () => {} },
        stderr: { on: () => {} },
        on: (_: string, cb: (code?: number) => void) => {
          setTimeout(() => cb(0), 50);
          return {};
        },
        kill: () => {},
      }),
    }));
    mock.module("../config", () => ({
      CONFIG_PATH: realConfig.CONFIG_PATH,
      PORT: realConfig.PORT,
      APP_CONFIG_FILE: realConfig.APP_CONFIG_FILE,
      SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
      SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
      LOGS_DIR: realConfig.LOGS_DIR,
      SNAPRAID_BIN: "snapraid",
    }));

    const { SnapRaidRunner: Runner } = await import("./snapraid-runner");
    const runner = new Runner();
    const first = runner.executeCommand("status", "/a/b.conf");
    await expect(runner.executeCommand("sync", "/a/b.conf")).rejects.toThrow(
      "Another command is already running"
    );
    await first;
  });
});
