import fs from "fs/promises"
import path from "path"
import type { SnapRaidCommand } from "@snapraid-webui/shared"
import { LOGS_DIR } from "../config"

/**
 * Create a log file for a command execution
 */
export async function createLogFile(
  command: SnapRaidCommand,
  content: string,
): Promise<string> {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\.\d{3}Z$/, "")
  const filename = `${command}-${timestamp}.log`
  const filePath = path.join(LOGS_DIR, filename)

  await fs.writeFile(filePath, content, "utf-8")
  return filename
}

/**
 * Append to a log file
 */
export async function appendToLogFile(
  filename: string,
  content: string,
): Promise<void> {
  const filePath = path.join(LOGS_DIR, filename)
  await fs.appendFile(filePath, content, "utf-8")
}
