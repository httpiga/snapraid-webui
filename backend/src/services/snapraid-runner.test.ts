import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import * as realConfig from "../config"

const { mock } = await import("bun:test")

const spawnState = {
  stdoutChunks: [] as string[],
  stderrChunks: [] as string[],
  closeCode: 0 as number | null,
  closeDelayMs: 0,
  error: null as NodeJS.ErrnoException | null,
  pid: 123,
  spawnCalls: [] as { bin: string; args: string[]; opts: object }[],
  killCalls: [] as string[],
}

mock.module("child_process", () => ({
  spawn: (bin: string, args: string[], opts: object) => {
    spawnState.spawnCalls.push({ bin, args, opts })
    const process = {
      pid: spawnState.pid,
      stdout: {
        on: (_: string, cb: (data: Buffer) => void) => {
          spawnState.stdoutChunks.forEach((chunk) =>
            setImmediate(() => cb(Buffer.from(chunk))),
          )
        },
      },
      stderr: {
        on: (_: string, cb: (data: Buffer) => void) => {
          spawnState.stderrChunks.forEach((chunk) =>
            setImmediate(() => cb(Buffer.from(chunk))),
          )
        },
      },
      on: (ev: string, cb: (arg?: any) => void) => {
        if (ev === "close" && spawnState.closeCode !== null) {
          const delay = spawnState.closeDelayMs
          if (delay > 0) {
            setTimeout(() => cb(spawnState.closeCode), delay)
          } else {
            setImmediate(() => cb(spawnState.closeCode))
          }
        }
        if (ev === "error" && spawnState.error) {
          setImmediate(() => cb(spawnState.error))
        }
        return process
      },
      kill: (signal: string) => {
        spawnState.killCalls.push(signal)
      },
    }
    return process
  },
}))

mock.module("../config", () => ({
  CONFIG_PATH: realConfig.CONFIG_PATH,
  PORT: realConfig.PORT,
  APP_CONFIG_FILE: realConfig.APP_CONFIG_FILE,
  SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
  SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
  LOGS_DIR: realConfig.LOGS_DIR,
  SNAPRAID_BIN: "snapraid",
}))

const { SnapRaidRunner } = await import("./snapraid-runner")

const resetSpawnState = () => {
  spawnState.stdoutChunks = []
  spawnState.stderrChunks = []
  spawnState.closeCode = 0
  spawnState.closeDelayMs = 0
  spawnState.error = null
  spawnState.spawnCalls = []
  spawnState.killCalls = []
}

beforeEach(() => {
  resetSpawnState()
})

afterEach(() => {
  resetSpawnState()
})

describe("SnapRaidRunner basics", () => {
  test("isRunning returns false when no command running", async () => {
    const runner = new SnapRaidRunner()
    expect(runner.isRunning()).toBe(false)
  })

  test("getCurrentJob returns null when no command running", async () => {
    const runner = new SnapRaidRunner()
    expect(runner.getCurrentJob()).toBeNull()
  })

  test("abort returns false when no command running", async () => {
    const runner = new SnapRaidRunner()
    expect(runner.abort()).toBe(false)
  })
})

describe("executeCommand behavior", () => {
  test("executeCommand resolves with output and exit code", async () => {
    spawnState.stdoutChunks = ["status line 1\n", "No sync is in progress.\n"]
    const runner = new SnapRaidRunner()
    const result = await runner.executeCommand(
      "status",
      "/tmp/config/snapraid.conf",
    )
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain(
      "$ snapraid -c /tmp/config/snapraid.conf status",
    )
    expect(result.output).toContain("status line 1")
    expect(result.output).toContain("No sync is in progress")
    expect(spawnState.spawnCalls.length).toBe(1)
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-c", "/tmp/config/snapraid.conf", "status"]),
    )
  })

  test("executeCommand calls onOutput with stdout and stderr chunks", async () => {
    spawnState.stdoutChunks = ["out1"]
    spawnState.stderrChunks = ["err1"]
    const chunks: string[] = []
    const runner = new SnapRaidRunner()
    await runner.executeCommand("status", "/x/y.conf", (chunk) =>
      chunks.push(chunk),
    )
    expect(chunks.length).toBe(3) // command line + out1 + err1
    expect(chunks[0]).toContain("$ snapraid -c /x/y.conf status")
    expect(chunks).toContain("out1")
    expect(chunks).toContain("err1")
  })

  test("executeCommand throws ENOENT as SNAPRAID_NOT_FOUND", async () => {
    spawnState.error = { code: "ENOENT" } as NodeJS.ErrnoException
    spawnState.closeCode = null
    const runner = new SnapRaidRunner()
    await expect(
      runner.executeCommand("status", "/x/y.conf"),
    ).rejects.toMatchObject({ code: "SNAPRAID_NOT_FOUND" })
  })

  test("executeCommand throws when another command is running", async () => {
    spawnState.closeDelayMs = 50
    const runner = new SnapRaidRunner()
    const first = runner.executeCommand("status", "/a/b.conf")
    await expect(runner.executeCommand("sync", "/a/b.conf")).rejects.toThrow(
      "Another command is already running",
    )
    await first
  })
})

describe("abort behavior", () => {
  test("abort sends SIGTERM and SIGKILL for running process", async () => {
    const runner = new SnapRaidRunner()
    const realSetTimeout = globalThis.setTimeout
    globalThis.setTimeout = ((fn: (...args: any[]) => void) => {
      fn()
      return 0 as any
    }) as typeof setTimeout

    ;(runner as any).currentProcess = {
      kill: (signal: string) => spawnState.killCalls.push(signal),
    }

    const result = runner.abort()
    globalThis.setTimeout = realSetTimeout
    expect(result).toBe(true)
    expect(spawnState.killCalls).toEqual(["SIGTERM", "SIGKILL"])
  })
})

describe("command helpers", () => {
  test("getStatus returns parsed status", async () => {
    spawnState.stdoutChunks = [
      "No sync is in progress.\n 12345 files\n 500.5 GB\n",
    ]
    const runner = new SnapRaidRunner()
    const status = await runner.getStatus("/a/b.conf")
    expect(status.parityUpToDate).toBe(true)
    expect(status.totalFiles).toBe(12345)
    expect(status.totalUsedGB).toBe(500.5)
  })

  test("getStatus returns disks and storage from fixed-width status output", async () => {
    const fixedWidthOutput = [
      "SnapRAID status report:",
      "",
      " Files Fragmented Excess Wasted Used Free Use Name",
      " Files Fragments GB GB GB",
      "   12345       0       0     0.0     500       100  50% d1",
      "    1000       0       0     0.0     100        50  66% d2",
      " --------------------------------------------------------------------------",
      "   13345       0       0     0.0     600       150  80%",
    ].join("\n")
    spawnState.stdoutChunks = [fixedWidthOutput]
    const runner = new SnapRaidRunner()
    const status = await runner.getStatus("/a/b.conf")
    expect(status.disks).toBeDefined()
    expect(status.disks!.length).toBe(2)
    expect(status.disks![0].name).toBe("d1")
    expect(status.disks![0].usedGB).toBe(500)
    expect(status.disks![0].freeGB).toBe(100)
    expect(status.disks![0].usePercent).toBe(83) // 500/600
    expect(status.disks![1].name).toBe("d2")
    expect(status.disks![1].usedGB).toBe(100)
    expect(status.disks![1].freeGB).toBe(50)
    expect(status.totalUsedGB).toBe(600)
    expect(status.totalFreeGB).toBe(150)
    expect(status.totalFiles).toBe(13345)
  })

  test("getDiff returns parsed diff report", async () => {
    spawnState.stdoutChunks = ["1 added, 2 removed"]
    const runner = new SnapRaidRunner()
    const diff = await runner.getDiff("/a/b.conf")
    expect(diff.newFiles).toBe(1)
    expect(diff.deletedFiles).toBe(2)
  })

  test("runSync passes preHash/forceEmpty/forceZero args only", async () => {
    const runner = new SnapRaidRunner()
    await runner.runSync("/a/b.conf", undefined, {
      preHash: true,
      forceEmpty: true,
      forceZero: true,
    })
    const args = spawnState.spawnCalls[0].args
    expect(args).toEqual(
      expect.arrayContaining(["--pre-hash", "--force-empty", "--force-zero"]),
    )
  })

  test("runScrub passes plan and olderThan", async () => {
    const runner = new SnapRaidRunner()
    await runner.runScrub("/a/b.conf", undefined, { plan: 10, olderThan: 7 })
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-p", "10", "-o", "7", "scrub"]),
    )
  })

  test("runFix passes filter options", async () => {
    const runner = new SnapRaidRunner()
    await runner.runFix("/a/b.conf", undefined, {
      filter: "foo",
      filterMissing: true,
      filterError: true,
      filterDisk: "d1",
    })
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-f", "foo", "-m", "-e", "-d", "d1", "fix"]),
    )
  })

  test("runCheck passes auditOnly and filter", async () => {
    const runner = new SnapRaidRunner()
    await runner.runCheck("/a/b.conf", undefined, {
      auditOnly: true,
      filter: "bar",
    })
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-a", "-f", "bar", "check"]),
    )
  })

  test("runCheck passes all filter options", async () => {
    const runner = new SnapRaidRunner()
    await runner.runCheck("/a/b.conf", undefined, {
      filter: "foo",
      filterDisk: "d1",
      filterMissing: true,
      filterError: true,
      importDir: "/import/path",
    })
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining([
        "-f",
        "foo",
        "-d",
        "d1",
        "-m",
        "-e",
        "-i",
        "/import/path",
        "check",
      ]),
    )
  })

  test("runScrub passes plan as bad", async () => {
    const runner = new SnapRaidRunner()
    await runner.runScrub("/a/b.conf", undefined, { plan: "bad" })
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-p", "bad", "scrub"]),
    )
  })

  test("runScrub passes plan as new", async () => {
    const runner = new SnapRaidRunner()
    await runner.runScrub("/a/b.conf", undefined, { plan: "new" })
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-p", "new", "scrub"]),
    )
  })

  test("runScrub passes plan as full", async () => {
    const runner = new SnapRaidRunner()
    await runner.runScrub("/a/b.conf", undefined, { plan: "full" })
    expect(spawnState.spawnCalls[0].args).toEqual(
      expect.arrayContaining(["-p", "full", "scrub"]),
    )
  })
})

describe("validateSyncSafety", () => {
  test("validateSyncSafety returns safe when all limits within bounds", async () => {
    spawnState.stdoutChunks = ["10 added, 5 removed, 3 updated, 100 equal\n"]
    const runner = new SnapRaidRunner()
    const result = await runner.validateSyncSafety("/a/b.conf", {
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    })
    expect(result.safe).toBe(true)
    expect(result.violations).toEqual([])
    expect(result.diff.newFiles).toBe(10)
    expect(result.diff.deletedFiles).toBe(5)
    expect(result.diff.modifiedFiles).toBe(3)
  })

  test("validateSyncSafety returns unsafe when deleted files exceed limit", async () => {
    spawnState.stdoutChunks = ["5 added, 150 removed, 10 updated\n"]
    const runner = new SnapRaidRunner()
    const result = await runner.validateSyncSafety("/a/b.conf", {
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    })
    expect(result.safe).toBe(false)
    expect(result.violations).toContain(
      "Deleted files (150) exceeds limit (100)",
    )
  })

  test("validateSyncSafety returns unsafe when updated files exceed limit", async () => {
    spawnState.stdoutChunks = ["5 added, 10 removed, 600 updated\n"]
    const runner = new SnapRaidRunner()
    const result = await runner.validateSyncSafety("/a/b.conf", {
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    })
    expect(result.safe).toBe(false)
    expect(result.violations).toContain(
      "Updated files (600) exceeds limit (500)",
    )
  })

  test("validateSyncSafety returns unsafe when added files exceed limit", async () => {
    spawnState.stdoutChunks = ["11000 added, 5 removed, 10 updated\n"]
    const runner = new SnapRaidRunner()
    const result = await runner.validateSyncSafety("/a/b.conf", {
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    })
    expect(result.safe).toBe(false)
    expect(result.violations).toContain(
      "Added files (11000) exceeds limit (10000)",
    )
  })

  test("validateSyncSafety returns multiple violations when multiple limits exceeded", async () => {
    spawnState.stdoutChunks = ["11000 added, 150 removed, 600 updated\n"]
    const runner = new SnapRaidRunner()
    const result = await runner.validateSyncSafety("/a/b.conf", {
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    })
    expect(result.safe).toBe(false)
    expect(result.violations.length).toBe(3)
    expect(result.violations).toContain(
      "Deleted files (150) exceeds limit (100)",
    )
    expect(result.violations).toContain(
      "Updated files (600) exceeds limit (500)",
    )
    expect(result.violations).toContain(
      "Added files (11000) exceeds limit (10000)",
    )
  })
})
