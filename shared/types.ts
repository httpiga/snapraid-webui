// Shared types between frontend and backend
// Single source of truth for all type definitions

// ============================================================================
// SnapRAID Configuration Types
// ============================================================================

export interface SnapRaidConfig {
  name: string;
  path: string;
  enabled: boolean;
}

export interface ParsedSnapRaidConfig {
  parity: string[];
  "2-parity"?: string[];
  "3-parity"?: string[];
  "4-parity"?: string[];
  "5-parity"?: string[];
  "6-parity"?: string[];
  content: string[];
  data: Record<string, string>;
  exclude: string[];
  include: string[];
  blocksize?: number;
  hashsize?: number;
  autosave?: number;
  pool?: string;
  nohidden?: boolean;
}

export interface AppConfig {
  version: string;
  snapraidConfigs: SnapRaidConfig[];
  logs: {
    maxHistoryEntries: number;
    directory: string;
    maxFiles: number;
    maxAgeDays: number;
  };
  notifications: NotificationSettings;
  syncSafety: SyncSafetySettings;
  advanced?: AdvancedSettings;
  auth: AuthSettings;
}

// ============================================================================
// Disk Types
// ============================================================================

export interface DiskInfo {
  name: string;
  path: string;
  type: "data" | "parity";
}

export interface DiskStatusInfo {
  name: string;
  files: number;
  fragmentedFiles: number;
  excessFragments: number;
  wastedGB: number;
  usedGB: number;
  freeGB: number;
  usePercent: number;
}

export interface DiskPowerStatus {
  name: string;
  device: string;
  status: "Active" | "Standby" | "Idle" | "Unknown";
}

// ============================================================================
// SnapRAID Status & Reports
// ============================================================================

export interface ScrubHistoryPoint {
  daysAgo: number;
  percentage: number;
}

export interface SnapRaidStatus {
  hasErrors: boolean;
  hasWarnings?: boolean;
  parityUpToDate: boolean;
  newFiles: number;
  modifiedFiles: number;
  deletedFiles: number;
  equalFiles?: number;
  movedFiles?: number;
  copiedFiles?: number;
  restoredFiles?: number;
  scrubPercentage?: number;
  syncInProgress?: boolean;
  oldestScrubDays?: number;
  medianScrubDays?: number;
  newestScrubDays?: number;
  fragmentedFiles?: number;
  wastedGB?: number;
  freeSpaceGB?: number;
  totalFiles?: number;
  totalUsedGB?: number;
  totalFreeGB?: number;
  disks?: DiskStatusInfo[];
  scrubHistory?: ScrubHistoryPoint[];
  rawOutput: string;
}

export interface ProbeReport {
  disks: DiskPowerStatus[];
  timestamp: string;
  rawOutput: string;
}

export interface DiffFileInfo {
  status:
    | "equal"
    | "added"
    | "removed"
    | "updated"
    | "moved"
    | "copied"
    | "restored";
  name: string;
  size?: string;
}

export interface DiffReport {
  files: DiffFileInfo[];
  totalFiles: number;
  equalFiles: number;
  newFiles: number;
  modifiedFiles: number;
  deletedFiles: number;
  movedFiles: number;
  copiedFiles: number;
  restoredFiles: number;
  timestamp: string;
  rawOutput: string;
}

export interface DeviceInfo {
  majorMinor: string;
  device: string;
  partMajorMinor: string;
  partition: string;
  diskName: string;
}

export interface DevicesReport {
  devices: DeviceInfo[];
  timestamp: string;
  rawOutput: string;
}

// ============================================================================
// Command Execution Types
// ============================================================================

export type SnapRaidCommand =
  | "status"
  | "sync"
  | "scrub"
  | "diff"
  | "fix"
  | "check"
  | "pool"
  | "probe"
  | "up"
  | "down"
  | "devices"
  | "list"
  | "dup"
  | "touch"
  | "rehash";

export interface CommandOutput {
  command: string;
  output: string;
  timestamp: string;
  exitCode: number | null;
}

export interface RunningJob {
  command: SnapRaidCommand;
  configPath: string;
  startTime: string;
  processId: string;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export type WSMessageType =
  | "output"
  | "complete"
  | "error"
  | "status"
  | "connected";

export interface WSMessage {
  type: WSMessageType;
  command?: string;
  args?: string[];
  chunk?: string;
  exitCode?: number;
  timestamp?: string;
  error?: string;
  status?: SnapRaidStatus;
  syncSafetySettings?: SyncSafetySettings;
}

// ============================================================================
// Scheduling Types
// ============================================================================

export interface Schedule {
  id: string;
  name: string;
  command: SnapRaidCommand;
  configPath: string;
  args?: string[];
  cronExpression: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleConfig {
  schedules: Schedule[];
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationChannel = "discord" | "telegram" | "email" | "slack";

export type NotificationEvent =
  | "sync_complete"
  | "sync_error"
  | "sync_aborted"
  | "sync_safety_halt"
  | "scrub_complete"
  | "scrub_error";

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  "sync_complete",
  "sync_error",
  "sync_aborted",
  "sync_safety_halt",
  "scrub_complete",
  "scrub_error",
];

interface NotificationChannelSettingsBase {
  enabled: boolean;
  events: NotificationEvent[];
}

export interface DiscordSettings extends NotificationChannelSettingsBase {
  webhookUrl: string;
}

export interface TelegramSettings extends NotificationChannelSettingsBase {
  botToken: string;
  chatId: string;
}

export interface EmailSettings extends NotificationChannelSettingsBase {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromAddress: string;
  toAddresses: string[];
}

export interface SlackSettings extends NotificationChannelSettingsBase {
  webhookUrl: string;
}

export interface NotificationSettings {
  channels: {
    discord: DiscordSettings;
    telegram: TelegramSettings;
    email: EmailSettings;
    slack: SlackSettings;
  };
}

// ============================================================================
// Sync Safety Types
// ============================================================================

export interface SyncSafetySettings {
  enabled: boolean;
  maxDeletedFiles: number;
  maxUpdatedFiles: number;
  maxAddedFiles: number;
  preHash: boolean;
  forceEmpty: boolean;
}

// ============================================================================
// Advanced Settings Types
// ============================================================================

export interface AdvancedSettings {
  spinDownOnError: boolean;
  bwLimit: string;
  forceUuid: boolean;
  errorLimit: number;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthSettings {
  enabled: boolean;
  username: string;
  passwordHash: string;
  sessionSecret: string;
}

// ============================================================================
// Log Types
// ============================================================================

export interface LogFile {
  filename: string;
  path: string;
  command: SnapRaidCommand;
  timestamp: string;
  size: number;
  /** True if the log is from a scheduled run, false if from a manual operation */
  scheduled?: boolean;
}

// ============================================================================
// File System Types
// ============================================================================

export interface FileSystemEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
}

export interface FileSystemResponse {
  basePath: string;
  path: string;
  parentPath: string | null;
  entries: FileSystemEntry[];
}

export interface SnapRaidFileInfo {
  size: number;
  date: string;
  time: string;
  name: string;
}

export interface ListReport {
  files: SnapRaidFileInfo[];
  totalFiles: number;
  totalSize: number;
  totalLinks: number;
  timestamp: string;
  rawOutput: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
