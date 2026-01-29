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

export interface SmartDiskInfo {
  name: string;
  device: string;
  status:
    | "OK"
    | "FAIL"
    | "PREFAIL"
    | "LOGFAIL"
    | "LOGERR"
    | "SELFERR"
    | "UNKNOWN";
  temperature?: number;
  powerOnHours?: number;
  failureProbability?: number;
  model?: string;
  serial?: string;
  size?: string;
  attributes?: SmartAttribute[];
}

export interface SmartAttribute {
  id: number;
  name: string;
  value: number;
  worst: number;
  threshold: number;
  raw: string;
  flag: string;
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

export interface SmartReport {
  disks: SmartDiskInfo[];
  timestamp: string;
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
  | "smart"
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
  chunk?: string;
  exitCode?: number;
  timestamp?: string;
  error?: string;
  status?: SnapRaidStatus;
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
  | "scrub_complete"
  | "scrub_error"
  | "smart_warning"
  | "smart_failure";

export interface DiscordSettings {
  enabled: boolean;
  webhookUrl: string;
}

export interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface EmailSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromAddress: string;
  toAddresses: string[];
}

export interface SlackSettings {
  enabled: boolean;
  webhookUrl: string;
}

export interface NotificationSettings {
  channels: {
    discord: DiscordSettings;
    telegram: TelegramSettings;
    email: EmailSettings;
    slack: SlackSettings;
  };
  events: Record<NotificationEvent, NotificationChannel[]>;
}

// ============================================================================
// Sync Safety Types
// ============================================================================

export interface SyncSafetySettings {
  enabled: boolean;
  maxDeletedFiles: number;
  maxDeletedPercent: number;
  runDiffBeforeSync: boolean;
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
