import type { SnapRaidCommand } from "@snapraid-webui/shared"
import { snapraidRunner } from "./snapraid-runner"
import {
  sendNotification,
  getOperationNotificationPayload,
} from "./notifications/index"
import {
  loadAdvancedSettings,
  getAdvancedArgsForCommand,
} from "./advanced-settings"

/**
 * Prepare command args: load advanced settings and merge with user args.
 * Used by both HTTP route and WebSocket handler.
 */
export async function prepareArgs(
  command: SnapRaidCommand,
  args: string[] = [],
): Promise<string[]> {
  const advancedSettings = await loadAdvancedSettings()
  const advancedArgs = getAdvancedArgsForCommand(advancedSettings, command)
  return [...advancedArgs, ...args]
}

export interface ExecuteWithNotificationOptions {
  onOutput?: (chunk: string) => void
  diffOutput?: string
}

/**
 * Execute a command and send operation notification on completion.
 * Used by HTTP long-running path and WebSocket streaming path.
 */
export async function executeWithNotification(
  command: SnapRaidCommand,
  configPath: string,
  args: string[],
  options?: ExecuteWithNotificationOptions,
): Promise<{ exitCode: number; output: string }> {
  const result = await snapraidRunner.executeCommand(
    command,
    configPath,
    options?.onOutput,
    args,
  )

  const payload = getOperationNotificationPayload(command, result.exitCode, {
    diffOutput: options?.diffOutput,
  })
  if (payload) {
    try {
      await sendNotification(
        payload.event,
        payload.title,
        payload.message,
        payload.details,
      )
    } catch (err) {
      console.error(
        "[notifications] Failed to send operation notification:",
        err,
      )
    }
  }

  return result
}
