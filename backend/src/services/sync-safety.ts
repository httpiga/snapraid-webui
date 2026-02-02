import fs from "fs/promises";
import { existsSync } from "fs";
import type { SyncSafetySettings } from "@snapraid-webui/shared";
import { APP_CONFIG_FILE } from "../config.js";

// Default sync safety settings
const defaultSettings: SyncSafetySettings = {
  enabled: true,
  maxDeletedFiles: 100,
  maxDeletedPercent: 10,
  runDiffBeforeSync: true,
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
