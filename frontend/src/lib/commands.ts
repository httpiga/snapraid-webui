import type { LucideIcon } from "lucide-react"
import {
  RefreshCw,
  GitCompare,
  Cross,
  Shield,
  Database,
  Scan,
  ArrowUp,
  ArrowDown,
  HardDrive,
  List,
  Copy,
  Hand,
  Hash,
  Activity,
  SearchCheck,
} from "lucide-react"
import type { SnapRaidCommand } from "@shared/types"

/**
 * Enum of every SnapRAID command, shared across pages.
 */
export const Command = {
  STATUS: "status",
  SYNC: "sync",
  SCRUB: "scrub",
  DIFF: "diff",
  FIX: "fix",
  CHECK: "check",
  POOL: "pool",
  PROBE: "probe",
  UP: "up",
  DOWN: "down",
  DEVICES: "devices",
  LIST: "list",
  DUP: "dup",
  TOUCH: "touch",
  REHASH: "rehash",
} as const satisfies Record<string, SnapRaidCommand>

export type CommandEnum = (typeof Command)[keyof typeof Command]

/** All command values in a single array. */
export const COMMAND_VALUES: readonly SnapRaidCommand[] = Object.values(
  Command,
) as SnapRaidCommand[]

/**
 * Maps every command to a unique Lucide icon.
 * Use with: const Icon = COMMAND_ICONS[command]; <Icon className="h-4 w-4" />
 */
export const COMMAND_ICONS: Record<SnapRaidCommand, LucideIcon> = {
  [Command.STATUS]: Activity,
  [Command.SYNC]: RefreshCw,
  [Command.SCRUB]: SearchCheck,
  [Command.DIFF]: GitCompare,
  [Command.FIX]: Cross,
  [Command.CHECK]: Shield,
  [Command.POOL]: Database,
  [Command.PROBE]: Scan,
  [Command.UP]: ArrowUp,
  [Command.DOWN]: ArrowDown,
  [Command.DEVICES]: HardDrive,
  [Command.LIST]: List,
  [Command.DUP]: Copy,
  [Command.TOUCH]: Hand,
  [Command.REHASH]: Hash,
}

/**
 * Maps every command to a display name (for badges, labels, etc.).
 */
export const COMMAND_LABELS: Record<SnapRaidCommand, string> = {
  [Command.STATUS]: "Status",
  [Command.SYNC]: "Sync",
  [Command.SCRUB]: "Scrub",
  [Command.DIFF]: "Diff",
  [Command.FIX]: "Fix",
  [Command.CHECK]: "Check",
  [Command.POOL]: "Pool",
  [Command.PROBE]: "Probe",
  [Command.UP]: "Up",
  [Command.DOWN]: "Down",
  [Command.DEVICES]: "Devices",
  [Command.LIST]: "List",
  [Command.DUP]: "Dup",
  [Command.TOUCH]: "Touch",
  [Command.REHASH]: "Rehash",
}

/**
 * Get the icon component for a command.
 */
export function getCommandIcon(command: SnapRaidCommand): LucideIcon {
  return COMMAND_ICONS[command]
}

/**
 * Get the display name for a command.
 */
export function getCommandLabel(command: SnapRaidCommand): string {
  return COMMAND_LABELS[command]
}
