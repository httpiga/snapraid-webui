import type { Response } from "express"
import type { SnapRaidCommand } from "@snapraid-webui/shared"
import { snapraidRunner } from "../services/snapraid-runner"
import {
  sendNotification,
  getOperationNotificationPayload,
} from "../services/notifications/index"

export const SNAPRAID_NOT_FOUND_MESSAGE = "SnapRAID binary not found"
export const SNAPRAID_NOT_FOUND_CODE = "SNAPRAID_NOT_FOUND"

export function isSnapraidNotFoundError(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as Error & { code: string }).code === "SNAPRAID_NOT_FOUND"
  )
}

export function sendSnapraidNotFound(res: Response): void {
  res.status(503).json({
    error: SNAPRAID_NOT_FOUND_MESSAGE,
    code: SNAPRAID_NOT_FOUND_CODE,
  })
}

export function handleSnapraidError(
  res: Response,
  error: unknown,
  logMessage: string,
  fallback: () => void,
): void {
  console.error(logMessage, error)
  if (isSnapraidNotFoundError(error)) {
    sendSnapraidNotFound(res)
    return
  }
  fallback()
}

export function respondIfCommandRunning(res: Response): boolean {
  if (!snapraidRunner.isRunning()) {
    return false
  }
  res.status(409).json({
    success: false,
    error: "Another command is already running",
    currentJob: snapraidRunner.getCurrentJob(),
  })
  return true
}

export async function getStatusWithDiff(configPath: string) {
  const status = await snapraidRunner.getStatus(configPath)
  try {
    const diff = await snapraidRunner.getDiff(configPath)
    status.newFiles = diff.newFiles
    status.modifiedFiles = diff.modifiedFiles
    status.deletedFiles = diff.deletedFiles
    if (status.newFiles + status.modifiedFiles + status.deletedFiles > 0) {
      status.parityUpToDate = false
    }
  } catch {
    // Keep status defaults if diff fails
  }
  return status
}

export const LONG_RUNNING_COMMANDS: SnapRaidCommand[] = [
  "sync",
  "scrub",
  "check",
  "fix",
]

export function queueLongRunningCommand(
  command: SnapRaidCommand,
  args: string[],
  configPath: string,
): void {
  snapraidRunner
    .executeCommand(command, configPath, undefined, args)
    .then(async (result) => {
      const payload = getOperationNotificationPayload(command, result.exitCode)
      if (payload) {
        try {
          await sendNotification(
            payload.event,
            payload.title,
            payload.message,
            payload.details,
          )
        } catch (err) {
          console.error("Failed to send operation notification:", err)
        }
      }
    })
    .catch((error) => {
      console.error(`Command ${command} failed:`, error)
    })
}

export const VALID_COMMANDS: SnapRaidCommand[] = [
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
]
