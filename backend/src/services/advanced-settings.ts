import fs from "fs/promises";
import { existsSync } from "fs";
import type { AdvancedSettings, SnapRaidCommand } from "@snapraid-webui/shared";
import { APP_CONFIG_FILE } from "../config.js";

// Default advanced settings
const defaultSettings: AdvancedSettings = {
  spinDownOnError: false,
  bwLimit: "",
  forceUuid: false,
  errorLimit: 0,
};

/**
 * Load advanced settings from app config
 */
export async function loadAdvancedSettings(): Promise<AdvancedSettings> {
  if (!existsSync(APP_CONFIG_FILE)) {
    return defaultSettings;
  }

  try {
    const content = await fs.readFile(APP_CONFIG_FILE, "utf-8");
    const config = JSON.parse(content);
    return config.advanced || defaultSettings;
  } catch {
    return defaultSettings;
  }
}

/**
 * Save advanced settings to app config
 */
export async function saveAdvancedSettings(
  settings: AdvancedSettings
): Promise<void> {
  let config: Record<string, unknown> = {};

  if (existsSync(APP_CONFIG_FILE)) {
    const content = await fs.readFile(APP_CONFIG_FILE, "utf-8");
    config = JSON.parse(content);
  }

  config.advanced = settings;
  await fs.writeFile(APP_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Get advanced CLI args for a specific command.
 * Returns an array of flags to prepend to user args.
 */
export function getAdvancedArgsForCommand(
  settings: AdvancedSettings,
  command: SnapRaidCommand
): string[] {
  const args: string[] = [];

  // Commands that support advanced options
  const longRunningCommands = ["sync", "scrub", "check", "fix"];
  if (!longRunningCommands.includes(command)) {
    return args;
  }

  // -s (spin-down on error): sync, scrub, check, fix
  if (settings.spinDownOnError) {
    args.push("-s");
  }

  // -w (bandwidth limit): sync, scrub, check, fix
  if (settings.bwLimit && settings.bwLimit.trim() !== "") {
    args.push("-w", settings.bwLimit.trim());
  }

  // -U (force UUID): sync, check, fix only
  if (settings.forceUuid && ["sync", "check", "fix"].includes(command)) {
    args.push("-U");
  }

  // -L (error limit): sync, scrub only
  if (settings.errorLimit > 0 && ["sync", "scrub"].includes(command)) {
    args.push("-L", settings.errorLimit.toString());
  }

  return args;
}
