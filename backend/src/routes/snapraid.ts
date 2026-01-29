import { Router, type IRouter } from "express";
import type { SnapRaidCommand } from "@snapraid-webui/shared";
import { SNAPRAID_CONF_FILE } from "../config.js";
import { snapraidRunner } from "../services/snapraid-runner.js";

const router: IRouter = Router();

const SNAPRAID_NOT_FOUND_MESSAGE = "SnapRAID binary not found";
const SNAPRAID_NOT_FOUND_CODE = "SNAPRAID_NOT_FOUND";

function isSnapraidNotFoundError(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as Error & { code: string }).code === "SNAPRAID_NOT_FOUND"
  );
}

function sendSnapraidNotFound(res: import("express").Response): void {
  res.status(503).json({
    error: SNAPRAID_NOT_FOUND_MESSAGE,
    code: SNAPRAID_NOT_FOUND_CODE,
  });
}

// Valid commands that can be executed
const VALID_COMMANDS: SnapRaidCommand[] = [
  "status",
  "sync",
  "scrub",
  "diff",
  "fix",
  "check",
  "pool",
  "smart",
  "probe",
  "up",
  "down",
  "devices",
  "list",
  "dup",
  "touch",
  "rehash",
];

/**
 * GET /api/status
 * Get the current SnapRAID status
 */
router.get("/status", async (_req, res) => {
  try {
    // Check if command is already running
    const currentJob = snapraidRunner.getCurrentJob();
    if (currentJob) {
      res.json({
        hasErrors: false,
        parityUpToDate: false,
        newFiles: 0,
        modifiedFiles: 0,
        deletedFiles: 0,
        syncInProgress: true,
        rawOutput: `Command "${currentJob.command}" is currently running...`,
      });
      return;
    }

    const status = await snapraidRunner.getStatus(SNAPRAID_CONF_FILE);
    // Merge new/modified/deleted from diff (status command doesn't output these)
    try {
      const diff = await snapraidRunner.getDiff(SNAPRAID_CONF_FILE);
      status.newFiles = diff.newFiles;
      status.modifiedFiles = diff.modifiedFiles;
      status.deletedFiles = diff.deletedFiles;
      // Pending changes mean sync is needed (status only says "No sync in progress" when parity matched at last sync)
      if (status.newFiles + status.modifiedFiles + status.deletedFiles > 0) {
        status.parityUpToDate = false;
      }
    } catch (_) {
      // Keep status defaults if diff fails
    }
    res.json(status);
  } catch (error) {
    console.error("Error getting status:", error);
    if (isSnapraidNotFoundError(error)) {
      sendSnapraidNotFound(res);
      return;
    }
    // Return a default status for other errors
    res.json({
      hasErrors: false,
      parityUpToDate: true,
      newFiles: 0,
      modifiedFiles: 0,
      deletedFiles: 0,
      rawOutput: `Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
  }
});

/**
 * GET /api/diff
 * Get the diff (changes since last sync)
 */
router.get("/diff", async (_req, res) => {
  try {
    const diff = await snapraidRunner.getDiff(SNAPRAID_CONF_FILE);
    res.json(diff);
  } catch (error) {
    console.error("Error getting diff:", error);
    if (isSnapraidNotFoundError(error)) {
      sendSnapraidNotFound(res);
      return;
    }
    res.status(500).json({ error: "Failed to get diff" });
  }
});

/**
 * GET /api/smart
 * Get SMART disk information
 */
router.get("/smart", async (_req, res) => {
  try {
    const smart = await snapraidRunner.getSmart(SNAPRAID_CONF_FILE);
    res.json(smart);
  } catch (error) {
    console.error("Error getting SMART info:", error);
    if (isSnapraidNotFoundError(error)) {
      sendSnapraidNotFound(res);
      return;
    }
    res.status(500).json({ error: "Failed to get SMART info" });
  }
});

/**
 * GET /api/job
 * Get the currently running job
 */
router.get("/job", (_req, res) => {
  const job = snapraidRunner.getCurrentJob();
  res.json(job);
});

/**
 * POST /api/command/:cmd
 * Execute a SnapRAID command
 */
router.post("/command/:cmd", async (req, res) => {
  const command = req.params.cmd as SnapRaidCommand;
  const { args = [] } = req.body as { args?: string[] };

  // Validate command
  if (!VALID_COMMANDS.includes(command)) {
    res
      .status(400)
      .json({ success: false, error: `Invalid command: ${command}` });
    return;
  }

  // Check if a command is already running
  if (snapraidRunner.isRunning()) {
    res.status(409).json({
      success: false,
      error: "Another command is already running",
      currentJob: snapraidRunner.getCurrentJob(),
    });
    return;
  }

  try {
    // For long-running commands, return immediately and let WebSocket handle output
    if (["sync", "scrub", "check", "fix"].includes(command)) {
      // Start the command but don't wait for it
      snapraidRunner
        .executeCommand(command, SNAPRAID_CONF_FILE, undefined, args)
        .then((result) => {
          console.log(
            `Command ${command} completed with exit code ${result.exitCode}`
          );
        })
        .catch((error) => {
          console.error(`Command ${command} failed:`, error);
        });

      res.json({
        success: true,
        message: `Command "${command}" started`,
        job: snapraidRunner.getCurrentJob(),
      });
      return;
    }

    // For quick commands, wait for result
    const result = await snapraidRunner.executeCommand(
      command,
      SNAPRAID_CONF_FILE,
      undefined,
      args
    );
    res.json({
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      output: result.output,
    });
  } catch (error) {
    console.error(`Error executing command ${command}:`, error);
    if (isSnapraidNotFoundError(error)) {
      sendSnapraidNotFound(res);
      return;
    }
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Command execution failed",
    });
  }
});

/**
 * POST /api/command/abort
 * Abort the currently running command
 */
router.post("/command/abort", (_req, res) => {
  const aborted = snapraidRunner.abort();

  if (aborted) {
    res.json({ success: true, message: "Abort signal sent" });
  } else {
    res
      .status(400)
      .json({ success: false, error: "No command is currently running" });
  }
});

/**
 * POST /api/fix
 * Run the fix command with options
 */
router.post("/fix", async (req, res) => {
  const { filter, filterMissing, filterError, filterDisk } = req.body as {
    filter?: string;
    filterMissing?: boolean;
    filterError?: boolean;
    filterDisk?: string;
  };

  if (snapraidRunner.isRunning()) {
    res.status(409).json({
      success: false,
      error: "Another command is already running",
    });
    return;
  }

  try {
    // Start fix command
    snapraidRunner
      .runFix(SNAPRAID_CONF_FILE, undefined, {
        filter,
        filterMissing,
        filterError,
        filterDisk,
      })
      .then((result) => {
        console.log(`Fix command completed with exit code ${result.exitCode}`);
      })
      .catch((error) => {
        console.error("Fix command failed:", error);
      });

    res.json({
      success: true,
      message: "Fix command started",
      job: snapraidRunner.getCurrentJob(),
    });
  } catch (error) {
    console.error("Error starting fix:", error);
    if (isSnapraidNotFoundError(error)) {
      sendSnapraidNotFound(res);
      return;
    }
    res
      .status(500)
      .json({ success: false, error: "Failed to start fix command" });
  }
});

export default router;
