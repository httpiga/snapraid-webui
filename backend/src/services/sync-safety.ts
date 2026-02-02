import fs from "fs/promises";
import { existsSync } from "fs";
import type { SyncSafetySettings } from "@snapraid-webui/shared";
import { APP_CONFIG_FILE } from "../config.js";
import { snapraidRunner } from "./snapraid-runner.js";
import { sendNotification } from "./notifications/index.js";

// Default sync safety settings
const defaultSettings: SyncSafetySettings = {
  enabled: true,
  maxDeletedFiles: 100,
  maxUpdatedFiles: 500,
  maxAddedFiles: 10000,
  preHash: false,
  forceEmpty: false,
};

/**
 * Load sync safety settings from app config
 */
export async function loadSyncSafetySettings(): Promise<SyncSafetySettings> {
  if (!existsSync(APP_CONFIG_FILE)) {
    return defaultSettings;
  }

  try {
    const content = await fs.readFile(APP_CONFIG_FILE, "utf-8");
    const config = JSON.parse(content);
    return config.syncSafety || defaultSettings;
  } catch {
    return defaultSettings;
  }
}

/**
 * Save sync safety settings to app config
 */
export async function saveSyncSafetySettings(
  settings: SyncSafetySettings
): Promise<void> {
  let config: Record<string, unknown> = {};

  if (existsSync(APP_CONFIG_FILE)) {
    const content = await fs.readFile(APP_CONFIG_FILE, "utf-8");
    config = JSON.parse(content);
  }

  config.syncSafety = settings;
  await fs.writeFile(APP_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Validates sync safety before executing a sync command.
 * If safety checks are enabled and validation fails, sends a notification.
 * Returns the validation result for the caller to handle the response.
 */
export async function validateSyncSafetyWithNotification(
  configPath: string
): Promise<
  | { safe: true }
  | {
      safe: false;
      violations: string[];
      diff: {
        deletedFiles: number;
        modifiedFiles: number;
        newFiles: number;
      };
    }
> {
  const safetySettings = await loadSyncSafetySettings();

  // If safety checks are disabled, allow sync to proceed
  if (!safetySettings.enabled) {
    return { safe: true };
  }

  // Validate sync safety
  const validation = await snapraidRunner.validateSyncSafety(
    configPath,
    safetySettings
  );

  // If validation fails, send notification
  if (!validation.safe) {
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
        }
      );
    } catch (err) {
      console.error("Failed to send sync safety halt notification:", err);
    }

    return {
      safe: false,
      violations: validation.violations,
      diff: {
        deletedFiles: validation.diff.deletedFiles,
        modifiedFiles: validation.diff.modifiedFiles,
        newFiles: validation.diff.newFiles,
      },
    };
  }

  return { safe: true };
}
