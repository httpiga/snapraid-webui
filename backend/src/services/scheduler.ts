import cron from "node-cron"
import cronParser from "cron-parser"
import fs from "fs/promises"
import { existsSync } from "fs"
import { v4 as uuidv4 } from "uuid"
import type { Schedule, ScheduleConfig } from "@snapraid-webui/shared"
import { SCHEDULES_FILE, SNAPRAID_CONF_FILE } from "../config"
import { snapraidRunner } from "./snapraid-runner"
import { createLogFile, appendToLogFile } from "./command-log"
import {
  sendNotification,
  getOperationNotificationPayload,
} from "./notifications/index"
import {
  loadAdvancedSettings,
  getAdvancedArgsForCommand,
} from "./advanced-settings"

// Active cron jobs
const activeJobs = new Map<string, cron.ScheduledTask>()

// Callback for schedule output (for WebSocket broadcasting)
type OutputCallback = (scheduleId: string, chunk: string) => void
let outputCallback: OutputCallback | undefined

/**
 * Set the callback for schedule output
 */
export function setScheduleOutputCallback(callback: OutputCallback): void {
  outputCallback = callback
}

/**
 * Load schedules from file
 */
async function loadSchedules(): Promise<Schedule[]> {
  if (!existsSync(SCHEDULES_FILE)) {
    return []
  }

  const content = await fs.readFile(SCHEDULES_FILE, "utf-8")
  const config: ScheduleConfig = JSON.parse(content)
  return config.schedules
}

/**
 * Save schedules to file
 */
async function saveSchedules(schedules: Schedule[]): Promise<void> {
  const config: ScheduleConfig = { schedules }
  await fs.writeFile(SCHEDULES_FILE, JSON.stringify(config, null, 2), "utf-8")
}

/**
 * Calculate the next run time for a cron expression (5-field: minute hour day month weekday).
 * Exported for testing.
 */
export function getNextRunTime(cronExpression: string): string | undefined {
  try {
    const interval = cronParser.parseExpression(cronExpression, {
      currentDate: new Date(),
    })
    const next = interval.next()
    return next.toDate().toISOString()
  } catch {
    return undefined
  }
}

/**
 * Execute a scheduled command
 */
async function executeScheduledCommand(schedule: Schedule): Promise<void> {
  console.log(
    `Executing scheduled command: ${schedule.name} (${schedule.command})`,
  )

  // Check if another command is running
  if (snapraidRunner.isRunning()) {
    console.log(
      `Skipping schedule ${schedule.name}: another command is running`,
    )
    return
  }

  // Create log file
  const logFile = await createLogFile(
    schedule.command,
    `=== Scheduled: ${schedule.name} ===\n` +
      `Command: ${schedule.command}\n` +
      `Started: ${new Date().toISOString()}\n` +
      `Cron: ${schedule.cronExpression}\n\n`,
  )

  try {
    // Load advanced settings and merge with schedule args
    const advancedSettings = await loadAdvancedSettings()
    const advancedArgs = getAdvancedArgsForCommand(
      advancedSettings,
      schedule.command,
    )
    const finalArgs = [...advancedArgs, ...(schedule.args || [])]

    const result = await snapraidRunner.executeCommand(
      schedule.command,
      schedule.configPath || SNAPRAID_CONF_FILE,
      (chunk) => {
        // Broadcast output
        outputCallback?.(schedule.id, chunk)
        // Append to log
        appendToLogFile(logFile, chunk).catch(console.error)
      },
      finalArgs,
    )

    await appendToLogFile(
      logFile,
      `\n=== Completed with exit code ${result.exitCode} ===\n`,
    )

    // Update last run time
    await updateScheduleLastRun(schedule.id)

    // Send notification for sync/scrub
    const payload = getOperationNotificationPayload(
      schedule.command,
      result.exitCode,
      { scheduleName: schedule.name },
    )
    if (payload) {
      try {
        await sendNotification(
          payload.event,
          payload.title,
          payload.message,
          payload.details,
        )
      } catch (err) {
        console.error("Failed to send schedule completion notification:", err)
      }
    }

    console.log(
      `Schedule ${schedule.name} completed with exit code ${result.exitCode}`,
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    await appendToLogFile(logFile, `\n=== ERROR: ${errorMessage} ===\n`)
    console.error(`Schedule ${schedule.name} failed:`, error)
  }
}

/**
 * Update the last run time of a schedule
 */
async function updateScheduleLastRun(scheduleId: string): Promise<void> {
  const schedules = await loadSchedules()
  const schedule = schedules.find((s) => s.id === scheduleId)

  if (schedule) {
    schedule.lastRun = new Date().toISOString()
    schedule.nextRun = getNextRunTime(schedule.cronExpression)
    schedule.updatedAt = new Date().toISOString()
    await saveSchedules(schedules)
  }
}

/**
 * Start a cron job for a schedule
 */
function startCronJob(schedule: Schedule): void {
  // Stop existing job if any
  stopCronJob(schedule.id)

  if (!schedule.enabled) {
    return
  }

  try {
    // Validate cron expression
    if (!cron.validate(schedule.cronExpression)) {
      console.error(
        `Invalid cron expression for schedule ${schedule.id}: ${schedule.cronExpression}`,
      )
      return
    }

    const job = cron.schedule(schedule.cronExpression, () => {
      executeScheduledCommand(schedule).catch(console.error)
    })

    activeJobs.set(schedule.id, job)
    console.log(
      `Started schedule: ${schedule.name} (${schedule.cronExpression})`,
    )
  } catch (error) {
    console.error(`Failed to start schedule ${schedule.id}:`, error)
  }
}

/**
 * Stop a cron job
 */
function stopCronJob(scheduleId: string): void {
  const job = activeJobs.get(scheduleId)
  if (job) {
    job.stop()
    activeJobs.delete(scheduleId)
  }
}

/**
 * Initialize the scheduler - load and start all enabled schedules
 */
export async function initializeScheduler(): Promise<void> {
  console.log("Initializing scheduler...")

  const schedules = await loadSchedules()

  for (const schedule of schedules) {
    if (schedule.enabled) {
      startCronJob(schedule)
    }
  }

  console.log(`Scheduler initialized with ${activeJobs.size} active schedules`)
}

/**
 * Get all schedules (nextRun recomputed from cron so it's always correct)
 */
export async function getSchedules(): Promise<Schedule[]> {
  const schedules = await loadSchedules()
  return schedules.map((s) => ({
    ...s,
    nextRun: getNextRunTime(s.cronExpression),
  }))
}

/**
 * Get a schedule by ID
 */
export async function getSchedule(id: string): Promise<Schedule | undefined> {
  const schedules = await loadSchedules()
  return schedules.find((s) => s.id === id)
}

/**
 * Create a new schedule
 */
export async function createSchedule(
  input: Omit<
    Schedule,
    "id" | "createdAt" | "updatedAt" | "lastRun" | "nextRun"
  >,
): Promise<Schedule> {
  // Validate cron expression
  if (!cron.validate(input.cronExpression)) {
    throw new Error(`Invalid cron expression: ${input.cronExpression}`)
  }

  const now = new Date().toISOString()
  const schedule: Schedule = {
    ...input,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    nextRun: getNextRunTime(input.cronExpression),
  }

  const schedules = await loadSchedules()
  schedules.push(schedule)
  await saveSchedules(schedules)

  if (schedule.enabled) {
    startCronJob(schedule)
  }

  return schedule
}

/**
 * Update a schedule
 */
export async function updateSchedule(
  id: string,
  updates: Partial<Omit<Schedule, "id" | "createdAt">>,
): Promise<Schedule> {
  const schedules = await loadSchedules()
  const index = schedules.findIndex((s) => s.id === id)

  if (index === -1) {
    throw new Error(`Schedule ${id} not found`)
  }

  // Validate cron expression if provided
  if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
    throw new Error(`Invalid cron expression: ${updates.cronExpression}`)
  }

  const existing = schedules[index]
  const updated: Schedule = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  if (updates.cronExpression) {
    updated.nextRun = getNextRunTime(updates.cronExpression)
  }

  schedules[index] = updated
  await saveSchedules(schedules)

  // Restart job if needed
  if (
    updates.enabled !== undefined ||
    updates.cronExpression ||
    updates.command !== undefined ||
    updates.args !== undefined
  ) {
    stopCronJob(id)
    if (updated.enabled) {
      startCronJob(updated)
    }
  }

  return updated
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(id: string): Promise<void> {
  stopCronJob(id)

  const schedules = await loadSchedules()
  const filtered = schedules.filter((s) => s.id !== id)

  if (filtered.length === schedules.length) {
    throw new Error(`Schedule ${id} not found`)
  }

  await saveSchedules(filtered)
}

/**
 * Stop all scheduled jobs
 */
export function stopAllJobs(): void {
  for (const [id, job] of activeJobs) {
    job.stop()
    console.log(`Stopped schedule: ${id}`)
  }
  activeJobs.clear()
}

/**
 * Get active job count
 */
export function getActiveJobCount(): number {
  return activeJobs.size
}
