import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as realConfig from "../config";

const { mock } = await import("bun:test");

const spawnState = {
  stdoutChunks: [] as string[],
  stderrChunks: [] as string[],
  closeCode: 0 as number | null,
  closeDelayMs: 0,
  error: null as (NodeJS.ErrnoException | null),
  pid: 123,
  spawnCalls: [] as { bin: string; args: string[]; opts: object }[],
  killCalls: [] as string[],
};

mock.module("child_process", () => ({
  spawn: (bin: string, args: string[], opts: object) => {
    spawnState.spawnCalls.push({ bin, args, opts });
    const process = {
      pid: spawnState.pid,
      stdout: {
        on: (_: string, cb: (data: Buffer) => void) => {
          spawnState.stdoutChunks.forEach((chunk) =>
            setImmediate(() => cb(Buffer.from(chunk)))
          );
        },
      },
      stderr: {
        on: (_: string, cb: (data: Buffer) => void) => {
          spawnState.stderrChunks.forEach((chunk) =>
            setImmediate(() => cb(Buffer.from(chunk)))
          );
        },
      },
      on: (ev: string, cb: (arg?: any) => void) => {
        if (ev === "close" && spawnState.closeCode !== null) {
          const delay = spawnState.closeDelayMs;
          if (delay > 0) {
            setTimeout(() => cb(spawnState.closeCode), delay);
          } else {
            setImmediate(() => cb(spawnState.closeCode));
          }
        }
        if (ev === "error" && spawnState.error) {
          setImmediate(() => cb(spawnState.error));
        }
        return process;
      },
      kill: (signal: string) => {
        spawnState.killCalls.push(signal);
      },
    };
    return process;
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

const { SnapRaidRunner } = await import("./snapraid-runner");

const resetSpawnState = () => {
  spawnState.stdoutChunks = [];
  spawnState.stderrChunks = [];
  spawnState.closeCode = 0;
  spawnState.closeDelayMs = 0;
  spawnState.error = null;
  spawnState.spawnCalls = [];
  spawnState.killCalls = [];
};

beforeEach(() => {
  resetSpawnState();
});

afterEach(() => {
  resetSpawnState();
});

describe("SnapRaidRunner basics", () => {
  test("isRunning returns false when no command running", async () => {
    const runner = new SnapRaidRunner();
    expect(runner.isRunning()).toBe(false);
  });

  test("getCurrentJob returns null when no command running", async () => {
    const runner = new SnapRaidRunner();
    expect(runner.getCurrentJob()).toBeNull();
  });

  test("abort returns false when no command running", async () => {
    const runner = new SnapRaidRunner();
    expect(runner.abort()).toBe(false);
  });
});

describe("executeCommand behavior", () => {
  test("executeCommand resolves with output and exit code", async () => {
    spawnState.stdoutChunks = ["status line 1\n", "No sync is in progress.\n"];
    const runner = new SnapRaidRunner();
    const result = await runner.executeCommand(
      "status",
      "/tmp/config/snapraid.conf"
    );
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("status line 1");
    expect(result.output).toContain("No sync is in progress");
    expect(spawnState.spawnCalls.length).toBe(1);
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-c", "/tmp/config/snapraid.conf", "status"])
    );
  });

  test("executeCommand calls onOutput with stdout and stderr chunks", async () => {
    spawnState.stdoutChunks = ["out1"];
    spawnState.stderrChunks = ["err1"];
    const chunks: string[] = [];
    const runner = new SnapRaidRunner();
    await runner.executeCommand("status", "/x/y.conf", (chunk) =>
      chunks.push(chunk)
    );
    expect(chunks).toContain("out1");
    expect(chunks).toContain("err1");
  });

  test("executeCommand throws ENOENT as SNAPRAID_NOT_FOUND", async () => {
    spawnState.error = { code: "ENOENT" } as NodeJS.ErrnoException;
    spawnState.closeCode = null;
    const runner = new SnapRaidRunner();
    await expect(
      runner.executeCommand("status", "/x/y.conf")
    ).rejects.toMatchObject({ code: "SNAPRAID_NOT_FOUND" });
  });

  test("executeCommand throws when another command is running", async () => {
    spawnState.closeDelayMs = 50;
    const runner = new SnapRaidRunner();
    const first = runner.executeCommand("status", "/a/b.conf");
    await expect(runner.executeCommand("sync", "/a/b.conf")).rejects.toThrow(
      "Another command is already running"
    );
    await first;
  });
});

describe("abort behavior", () => {
  test("abort sends SIGTERM and SIGKILL for running process", async () => {
    const runner = new SnapRaidRunner();
    const realSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: (...args: any[]) => void) => {
      fn();
      return 0 as any;
    }) as typeof setTimeout;

    (runner as any).currentProcess = {
      kill: (signal: string) => spawnState.killCalls.push(signal),
    };

    const result = runner.abort();
    globalThis.setTimeout = realSetTimeout;
    expect(result).toBe(true);
    expect(spawnState.killCalls).toEqual(["SIGTERM", "SIGKILL"]);
  });
});

describe("command helpers", () => {
  test("getStatus returns parsed status", async () => {
    spawnState.stdoutChunks = [
      "No sync is in progress.\n 12345 files\n 500.5 GB\n",
    ];
    const runner = new SnapRaidRunner();
    const status = await runner.getStatus("/a/b.conf");
    expect(status.parityUpToDate).toBe(true);
    expect(status.totalFiles).toBe(12345);
    expect(status.totalUsedGB).toBe(500.5);
  });

  test("getDiff returns parsed diff report", async () => {
    spawnState.stdoutChunks = ["1 added, 2 removed"];
    const runner = new SnapRaidRunner();
    const diff = await runner.getDiff("/a/b.conf");
    expect(diff.newFiles).toBe(1);
    expect(diff.deletedFiles).toBe(2);
  });

  test("getSmart returns parsed smart report", async () => {
    spawnState.stdoutChunks = [
      "  32C   7601       -   0%   4TB     S3YJNA0M123456  /dev/sda  d1",
    ];
    const runner = new SnapRaidRunner();
    const smart = await runner.getSmart("/a/b.conf");
    expect(smart.disks.length).toBe(1);
    expect(smart.disks[0].name).toBe("d1");
  });

  test("runSync passes preHash/forceEmpty/forceZero args", async () => {
    const runner = new SnapRaidRunner();
    await runner.runSync("/a/b.conf", undefined, {
      preHash: true,
      forceEmpty: true,
      forceZero: true,
    });
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["--pre-hash", "--force-empty", "--force-zero"])
    );
  });

  test("runScrub passes plan and olderThan", async () => {
    const runner = new SnapRaidRunner();
    await runner.runScrub("/a/b.conf", undefined, { plan: 10, olderThan: 7 });
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-p", "10", "-o", "7", "scrub"])
    );
  });

  test("runFix passes filter options", async () => {
    const runner = new SnapRaidRunner();
    await runner.runFix("/a/b.conf", undefined, {
      filter: "foo",
      filterMissing: true,
      filterError: true,
      filterDisk: "d1",
    });
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-f", "foo", "-m", "-e", "-d", "d1", "fix"])
    );
  });

  test("runCheck passes auditOnly and filter", async () => {
    const runner = new SnapRaidRunner();
    await runner.runCheck("/a/b.conf", undefined, {
      auditOnly: true,
      filter: "bar",
    });
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-a", "-f", "bar", "check"])
    );
  });
});

describe("sync safety settings", () => {
  test("runSync with maxDeletedFiles adds filter-delete args", async () => {
    const runner = new SnapRaidRunner();
    await runner.runSync("/a/b.conf", undefined, {
      maxDeletedFiles: 100,
    });
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-d", "100", "sync"])
    );
  });

  test("runSync with maxDeletedPercent adds filter-delete-percentage args", async () => {
    const runner = new SnapRaidRunner();
    await runner.runSync("/a/b.conf", undefined, {
      maxDeletedPercent: 10,
    });
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-p", "10", "sync"])
    );
  });

  test("runSync combines all safety options correctly", async () => {
    const runner = new SnapRaidRunner();
    await runner.runSync("/a/b.conf", undefined, {
      preHash: true,
      maxDeletedFiles: 50,
      maxDeletedPercent: 5,
      forceEmpty: false,
    });
    const args = spawnState.spawnCalls[0].args;
    expect(args).toContain("--pre-hash");
    expect(args).toContain("-d");
    expect(args).toContain("50");
    expect(args).toContain("-p");
    expect(args).toContain("5");
    expect(args).toContain("sync");
    expect(args).not.toContain("--force-empty");
  });

  test("runSync without safety options only runs sync", async () => {
    const runner = new SnapRaidRunner();
    await runner.runSync("/a/b.conf", undefined, {});
    const args = spawnState.spawnCalls[0].args;
    expect(args).toEqual(["-c", "/a/b.conf", "sync"]);
  });

  test("runSync forceEmpty flag bypasses delete checks", async () => {
    const runner = new SnapRaidRunner();
    await runner.runSync("/a/b.conf", undefined, {
      forceEmpty: true,
      maxDeletedFiles: 10,
      maxDeletedPercent: 5,
    });
    const args = spawnState.spawnCalls[0].args;
    expect(args).toContain("--force-empty");
    // When force-empty is used, SnapRAID ignores delete thresholds
    // but we can still pass them for informational purposes
  });
});
