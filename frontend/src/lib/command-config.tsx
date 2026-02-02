import {
  RefreshCw,
  Search,
  Shield,
  Wrench,
  Thermometer,
  Terminal,
} from "lucide-react";
import type { SnapRaidCommand } from "@shared/types";

export interface CommandOption {
  name: string;
  key: string;
  type: "boolean" | "number" | "string";
  description: string;
  default?: unknown;
}

export interface CommandConfig {
  name: string;
  command: SnapRaidCommand;
  description: string;
  icon: React.ReactNode;
  longRunning: boolean;
  options?: CommandOption[];
}

export const commands: CommandConfig[] = [
  {
    name: "Sync",
    command: "sync",
    description: "Update parity information for changed files",
    icon: <RefreshCw className="h-4 w-4 mr-1" />,
    longRunning: true,
    // Sync safety options are handled by SyncSafetySettings component
    options: [],
  },
  {
    name: "Scrub",
    command: "scrub",
    description: "Check data integrity and find silent errors",
    icon: <Search className="h-4 w-4 mr-1" />,
    longRunning: true,
    options: [
      {
        name: "Plan (%)",
        key: "plan",
        type: "number",
        description: "Percentage of data to scrub",
        default: 8,
      },
      {
        name: "Older Than (days)",
        key: "older-than",
        type: "number",
        description: "Only scrub data older than N days",
        default: 10,
      },
    ],
  },
  {
    name: "Check",
    command: "check",
    description: "Verify data and parity without making changes",
    icon: <Shield className="h-4 w-4 mr-1" />,
    longRunning: true,
    options: [
      {
        name: "Audit Only",
        key: "audit-only",
        type: "boolean",
        description: "Only check file hashes, skip parity",
      },
    ],
  },
  {
    name: "Status",
    command: "status",
    description: "Show current array status",
    icon: <Terminal className="h-4 w-4 mr-1" />,
    longRunning: false,
  },
  {
    name: "Diff",
    command: "diff",
    description: "Show changes since last sync",
    icon: <Terminal className="h-4 w-4 mr-1" />,
    longRunning: false,
  },
  {
    name: "SMART",
    command: "smart",
    description: "Show disk health information",
    icon: <Thermometer className="h-4 w-4 mr-1" />,
    longRunning: false,
  },
  {
    name: "Fix",
    command: "fix",
    description: "Recover damaged files using parity",
    icon: <Wrench className="h-4 w-4 mr-1" />,
    longRunning: true,
    options: [
      {
        name: "Filter",
        key: "filter",
        type: "string",
        description: "Filter files to fix (path or pattern)",
      },
      {
        name: "Missing Only",
        key: "filter-missing",
        type: "boolean",
        description: "Only restore deleted files",
      },
      {
        name: "Errors Only",
        key: "filter-error",
        type: "boolean",
        description: "Only fix files with errors",
      },
    ],
  },
];

/** Commands that can be scheduled (sync, scrub, check, status) */
export const schedulableCommands = commands.filter((c) =>
  ["sync", "scrub", "check", "status"].includes(c.command)
);

// Map option keys to their CLI argument flags
const optionKeyToCliFlag: Record<string, string> = {
  "max-deleted-files": "-d",
  "max-deleted-percent": "-p",
  "older-than": "-o",
  plan: "-p",
  filter: "-f",
};

/**
 * Convert options state to SnapRAID CLI args
 */
export function optionsToArgs(
  commandConfig: CommandConfig,
  options: Record<string, unknown>
): string[] {
  const args: string[] = [];
  if (!commandConfig.options) return args;

  for (const opt of commandConfig.options) {
    const value = options[opt.key];
    if (value === undefined || value === false || value === "") continue;

    if (opt.type === "boolean") {
      args.push(`--${opt.key}`);
    } else {
      // Use mapped flag or fallback to first character
      const flag = optionKeyToCliFlag[opt.key] || `-${opt.key.charAt(0)}`;
      args.push(flag, String(value));
    }
  }
  return args;
}

/**
 * Parse SnapRAID CLI args back into options state (for editing schedules)
 */
export function argsToOptions(
  commandConfig: CommandConfig,
  args: string[] = []
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!commandConfig.options) return result;

  for (const opt of commandConfig.options) {
    if (opt.type === "boolean") {
      result[opt.key] = args.includes(`--${opt.key}`);
    } else {
      // Use mapped flag or fallback to first character
      const flag = optionKeyToCliFlag[opt.key] || `-${opt.key.charAt(0)}`;
      const idx = args.indexOf(flag);
      if (idx !== -1 && idx + 1 < args.length) {
        const raw = args[idx + 1];
        result[opt.key] =
          opt.type === "number" ? parseInt(raw, 10) || opt.default : raw;
      } else if (opt.default !== undefined) {
        result[opt.key] = opt.default;
      }
    }
  }
  return result;
}

export function getCommandConfig(
  command: SnapRaidCommand
): CommandConfig | undefined {
  return commands.find((c) => c.command === command);
}

/**
 * Convert sync safety options to CLI args.
 * This is separate from optionsToArgs since sync safety is handled
 * by the SyncSafetySettings component.
 *
 * Note: Safety checks (deleted/updated/added file limits) are enforced
 * by the backend before running sync, not via SnapRAID CLI flags.
 * Only --pre-hash and --force-empty flags are passed to SnapRAID.
 */
export function syncSafetyToArgs(
  mode: "disabled" | "default" | "custom",
  options: {
    preHash?: boolean;
    forceEmpty?: boolean;
  },
  defaultSettings?: {
    preHash?: boolean;
    forceEmpty?: boolean;
  } | null
): string[] {
  const args: string[] = [];

  // Use options for custom/disabled modes, or default settings for default mode
  const usePreHash =
    mode === "default" && defaultSettings
      ? defaultSettings.preHash
      : options.preHash;
  const useForceEmpty =
    mode === "default" && defaultSettings
      ? defaultSettings.forceEmpty
      : options.forceEmpty;

  // Pre-hash
  if (usePreHash) {
    args.push("--pre-hash");
  }

  // Force empty
  if (useForceEmpty) {
    args.push("--force-empty");
  }

  return args;
}

/**
 * Parse CLI args back into sync safety options.
 * This is the inverse of syncSafetyToArgs.
 */
export function argsToSyncSafety(args: string[] = []): {
  mode: "disabled" | "default" | "custom";
  preHash: boolean;
  forceEmpty: boolean;
} {
  const preHash = args.includes("--pre-hash");
  const forceEmpty = args.includes("--force-empty");

  // Determine mode: if no flags at all, it's disabled; otherwise default
  // (custom mode can't be determined from args alone since safety limits
  // are now enforced by backend, not via CLI flags)
  let mode: "disabled" | "default" | "custom";
  if (!preHash && !forceEmpty) {
    mode = "disabled";
  } else {
    mode = "default";
  }

  return {
    mode,
    preHash,
    forceEmpty,
  };
}
