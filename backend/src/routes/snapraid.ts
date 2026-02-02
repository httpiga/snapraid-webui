import { Router, type IRouter } from "express";
import type { SnapRaidCommand } from "@snapraid-webui/shared";
import { SNAPRAID_CONF_FILE } from "../config.js";
import { snapraidRunner } from "../services/snapraid-runner.js";
import {
  sendNotification,
  getOperationNotificationPayload,
} from "../services/notifications/index.js";
import { validateSyncSafetyWithNotification } from "../services/sync-safety.js";
import {
  loadAdvancedSettings,
  getAdvancedArgsForCommand,
} from "../services/advanced-settings.js";

const router: IRouter = Router();
type ExpressResponse = import("express").Response;

const SNAPRAID_NOT_FOUND_MESSAGE = "SnapRAID binary not found";
const SNAPRAID_NOT_FOUND_CODE = "SNAPRAID_NOT_FOUND";

function isSnapraidNotFoundError(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as Error & { code: string }).code === "SNAPRAID_NOT_FOUND"
  );
}

function sendSnapraidNotFound(res: ExpressResponse): void {
  res.status(503).json({
    error: SNAPRAID_NOT_FOUND_MESSAGE,
    code: SNAPRAID_NOT_FOUND_CODE,
  });
}

function handleSnapraidError(
  res: ExpressResponse,
  error: unknown,
  logMessage: string,
  fallback: () => void
): void {
  console.error(logMessage, error);
  if (isSnapraidNotFoundError(error)) {
    sendSnapraidNotFound(res);
    return;
  }
  fallback();
}

function respondIfCommandRunning(res: ExpressResponse): boolean {
  if (!snapraidRunner.isRunning()) {
    return false;
  }
  res.status(409).json({
    success: false,
    error: "Another command is already running",
    currentJob: snapraidRunner.getCurrentJob(),
  });
  return true;
}

async function getStatusWithDiff() {
  const status = await snapraidRunner.getStatus(SNAPRAID_CONF_FILE);
  try {
    const diff = await snapraidRunner.getDiff(SNAPRAID_CONF_FILE);
    status.newFiles = diff.newFiles;
    status.modifiedFiles = diff.modifiedFiles;
    status.deletedFiles = diff.deletedFiles;
    if (status.newFiles + status.modifiedFiles + status.deletedFiles > 0) {
      status.parityUpToDate = false;
    }
  } catch (_) {
    // Keep status defaults if diff fails
  }
  return status;
}

const LONG_RUNNING_COMMANDS: SnapRaidCommand[] = [
  "sync",
  "scrub",
  "check",
  "fix",
];

function queueLongRunningCommand(command: SnapRaidCommand, args: string[]) {
  snapraidRunner
    .executeCommand(command, SNAPRAID_CONF_FILE, undefined, args)
    .then(async (result) => {
      const payload = getOperationNotificationPayload(command, result.exitCode);
      if (payload) {
        try {
          await sendNotification(
            payload.event,
            payload.title,
            payload.message,
            payload.details
          );
        } catch (err) {
          console.error("Failed to send operation notification:", err);
        }
      }
    })
    .catch((error) => {
      console.error(`Command ${command} failed:`, error);
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

    const status = await getStatusWithDiff();
    res.json(status);
  } catch (error) {
    handleSnapraidError(res, error, "Error getting status:", () => {
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
    handleSnapraidError(res, error, "Error getting diff:", () => {
      res.status(500).json({ error: "Failed to get diff" });
    });
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
  if (respondIfCommandRunning(res)) {
    return;
  }

  try {
    // Load advanced settings and merge with user args
    const advancedSettings = await loadAdvancedSettings();
    const advancedArgs = getAdvancedArgsForCommand(advancedSettings, command);
    const finalArgs = [...advancedArgs, ...args];

    // Check sync safety before running sync command
    if (command === "sync") {
      // Validate sync safety before executing
      const validation = await validateSyncSafetyWithNotification(
        SNAPRAID_CONF_FILE
      );

      if (!validation.safe) {
        res.status(400).json({
          success: false,
          error: `Sync halted: ${validation.violations.join("; ")}`,
          violations: validation.violations,
          diff: validation.diff,
        });
        return;
      }
    }

    if (LONG_RUNNING_COMMANDS.includes(command)) {
      queueLongRunningCommand(command, finalArgs);
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
      finalArgs
    );
    res.json({
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      output: result.output,
    });
  } catch (error) {
    handleSnapraidError(
      res,
      error,
      `Error executing command ${command}:`,
      () => {
        res.status(500).json({
          success: false,
          error:
            error instanceof Error ? error.message : "Command execution failed",
        });
      }
    );
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

  if (respondIfCommandRunning(res)) {
    return;
  }

  try {
    // Load advanced settings and merge with fix options
    const advancedSettings = await loadAdvancedSettings();
    const advancedArgs = getAdvancedArgsForCommand(advancedSettings, "fix");

    // Start fix command
    snapraidRunner
      .runFix(SNAPRAID_CONF_FILE, undefined, {
        filter,
        filterMissing,
        filterError,
        filterDisk,
        extraArgs: advancedArgs,
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
    handleSnapraidError(res, error, "Error starting fix:", () => {
      res
        .status(500)
        .json({ success: false, error: "Failed to start fix command" });
    });
  }
});

export default router;
