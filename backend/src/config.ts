import path from "path";

// Environment configuration
export const CONFIG_PATH =
  process.env.CONFIG_PATH || path.join(import.meta.dir, "../../config");
export const PORT = parseInt(process.env.PORT || "3000", 10);

// File paths
export const APP_CONFIG_FILE = path.join(CONFIG_PATH, "app-config.json");
export const SCHEDULES_FILE = path.join(CONFIG_PATH, "schedules.json");
export const SNAPRAID_CONF_FILE = path.join(CONFIG_PATH, "snapraid.conf");
export const LOGS_DIR = path.join(CONFIG_PATH, "logs");

// SnapRAID binary
export const SNAPRAID_BIN = process.env.SNAPRAID_BIN || "/usr/bin/snapraid";
