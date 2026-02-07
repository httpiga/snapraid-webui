import fs from "fs/promises"
import { existsSync } from "fs"
import type { SyncSafetySettings } from "@snapraid-webui/shared"
import { APP_CONFIG_FILE } from "../config"
import { snapraidRunner } from "./snapraid-runner"
import { sendNotification } from "./notifications/index"

// Default sync safety settings
const defaultSettings: SyncSafetySettings = {
  enabled: true,
  maxDeletedFiles: 100,
  maxUpdatedFiles: 500,
  maxAddedFiles: 10000,
  preHash: false,
  forceEmpty: false,
}

/**
 * Load sync safety settings from app config
 */
export async function loadSyncSafetySettings(): Promise<SyncSafetySettings> {
  if (!existsSync(APP_CONFIG_FILE)) {
    return defaultSettings
  }

  try {
    const content = await fs.readFile(APP_CONFIG_FILE, "utf-8")
    const config = JSON.parse(content)
    return config.syncSafety || defaultSettings
  } catch {
    return defaultSettings
  }
}

/**
 * Save sync safety settings to app config
 */
export async function saveSyncSafetySettings(
  settings: SyncSafetySettings,
): Promise<void> {
  let config: Record<string, unknown> = {}

  if (existsSync(APP_CONFIG_FILE)) {
    const content = await fs.readFile(APP_CONFIG_FILE, "utf-8")
    config = JSON.parse(content)
  }

  config.syncSafety = settings
  await fs.writeFile(APP_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8")
}

/**
 * Validates sync safety before executing a sync command.
 * If safety checks are enabled and validation fails, sends a notification.
 * Returns the validation result for the caller to handle the response.
 *
 * @param configPath Path to SnapRAID config file
 * @param onOutput Optional callback to stream diff command output to the client
 * @param explicitSettings Optional explicit settings (overrides config file, always runs validation)
 */
export async function validateSyncSafetyWithNotification(
  configPath: string,
  onOutput?: (chunk: string) => void,
  explicitSettings?: SyncSafetySettings,
): Promise<
  | { safe: true }
  | {
      safe: false
      violations: string[]
      diff: {
        deletedFiles: number
        modifiedFiles: number
        newFiles: number
      }
    }
> {
  // Use explicit settings if provided, otherwise load from config
  const safetySettings = explicitSettings || (await loadSyncSafetySettings())

  // If no explicit settings provided and safety checks are disabled in config, skip validation
  if (!explicitSettings && !safetySettings.enabled) {
    return { safe: true }
  }

  // Send header message if output callback provided
  if (onOutput) {
    onOutput(
      "\n=== Checking Sync Safety Limits ===\nRunning diff to detect changes...\n\n",
    )
  }

  // Validate sync safety (with output streaming)
  const validation = await snapraidRunner.validateSyncSafety(
    configPath,
    safetySettings,
    onOutput,
  )

  // Send validation result message
  if (onOutput) {
    onOutput("\n=== Safety Check Results ===\n")
    onOutput(`Deleted files: ${validation.diff.deletedFiles}\n`)
    onOutput(`Updated files: ${validation.diff.modifiedFiles}\n`)
    onOutput(`Added files: ${validation.diff.newFiles}\n\n`)
  }

  // If validation fails, send notification and result message
  if (!validation.safe) {
    if (onOutput) {
      onOutput("❌ SYNC HALTED - Safety limits exceeded:\n")
      validation.violations.forEach((v) => {
        onOutput(`   - ${v}\n`)
      })
      onOutput("\n")
    }

    try {
      await sendNotification(
        "sync_safety_halt",
        "Sync Halted - Safety Limits Exceeded",
        "Sync operation was prevented due to safety check failures.",
        {
          Violations: validation.violations.join("; "),
          "Deleted Files": validation.diff.deletedFiles.toString(),
          "Updated Files": validation.diff.modifiedFiles.toString(),
          "Added Files": validation.diff.newFiles.toString(),
        },
      )
    } catch (err) {
      console.error("Failed to send sync safety halt notification:", err)
    }

    return {
      safe: false,
      violations: validation.violations,
      diff: {
        deletedFiles: validation.diff.deletedFiles,
        modifiedFiles: validation.diff.modifiedFiles,
        newFiles: validation.diff.newFiles,
      },
    }
  }

  // Validation passed
  if (onOutput) {
    onOutput("✓ Safety checks passed - proceeding with sync\n\n")
  }

  return { safe: true }
}
