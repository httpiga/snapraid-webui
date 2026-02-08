import type { Response } from "express"
import type { SnapRaidCommand } from "@snapraid-webui/shared"
import { snapraidRunner } from "../services/snapraid-runner"
import { executeWithNotification } from "../services/command-execution"

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

export { LONG_RUNNING_COMMANDS } from "@snapraid-webui/shared"

export function queueLongRunningCommand(
  command: SnapRaidCommand,
  args: string[],
  configPath: string,
): void {
  executeWithNotification(command, configPath, args).catch((error) => {
    console.error(`Command ${command} failed:`, error)
  })
}

export { VALID_COMMANDS } from "@snapraid-webui/shared"
