import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment configuration
export const CONFIG_PATH =
  process.env.CONFIG_PATH || path.join(__dirname, "../../config");
export const PORT = parseInt(process.env.PORT || "3000", 10);

// File paths
export const APP_CONFIG_FILE = path.join(CONFIG_PATH, "app-config.json");
export const SCHEDULES_FILE = path.join(CONFIG_PATH, "schedules.json");
export const SNAPRAID_CONF_FILE = path.join(CONFIG_PATH, "snapraid.conf");
export const LOGS_DIR = path.join(CONFIG_PATH, "logs");

// SnapRAID binary
export const SNAPRAID_BIN = process.env.SNAPRAID_BIN || "/usr/bin/snapraid";
