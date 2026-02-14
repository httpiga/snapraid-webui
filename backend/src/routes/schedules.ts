import { Router, type IRouter } from "express"
import {
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../services/scheduler"

const router: IRouter = Router()
type ExpressResponse = import("express").Response

function handleScheduleMutationError(
  res: ExpressResponse,
  error: unknown,
  logMessage: string,
  defaultStatus: number,
  fallbackMessage: string,
) {
  const message = error instanceof Error ? error.message : fallbackMessage
  console.error(logMessage, error)

  if (message.includes("not found")) {
    res.status(404).json({ error: message })
    return
  }

  res.status(defaultStatus).json({ error: message })
}

/**
 * GET /api/schedules
 * List all schedules
 */
router.get("/", async (_req, res) => {
  try {
    const schedules = await getSchedules()
    res.json(schedules)
  } catch (error) {
    console.error("Error getting schedules:", error)
    res.status(500).json({ error: "Failed to get schedules" })
  }
})

/**
 * GET /api/schedules/:id
 * Get a specific schedule
 */
router.get("/:id", async (req, res) => {
  try {
    const schedule = await getSchedule(req.params.id)

    if (!schedule) {
      res.status(404).json({ error: "Schedule not found" })
      return
    }

    res.json(schedule)
  } catch (error) {
    console.error("Error getting schedule:", error)
    res.status(500).json({ error: "Failed to get schedule" })
  }
})

/**
 * POST /api/schedules
 * Create a new schedule
 */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      command,
      configPath,
      args,
      cronExpression,
      enabled = true,
      syncSafetyMode,
    } = req.body

    // Validate required fields
    if (!name || !command || !cronExpression) {
      res.status(400).json({
        error: "Missing required fields: name, command, cronExpression",
      })
      return
    }

    const schedule = await createSchedule({
      name,
      command,
      configPath: configPath || "",
      args,
      cronExpression,
      enabled,
      syncSafetyMode,
    })

    res.status(201).json(schedule)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create schedule"
    console.error("Error creating schedule:", error)
    res.status(400).json({ error: message })
  }
})

/**
 * PUT /api/schedules/:id
 * Update a schedule
 */
router.put("/:id", async (req, res) => {
  try {
    const schedule = await updateSchedule(req.params.id, req.body)
    res.json(schedule)
  } catch (error) {
    handleScheduleMutationError(
      res,
      error,
      "Error updating schedule:",
      400,
      "Failed to update schedule",
    )
  }
})

/**
 * DELETE /api/schedules/:id
 * Delete a schedule
 */
router.delete("/:id", async (req, res) => {
  try {
    await deleteSchedule(req.params.id)
    res.json({ success: true })
  } catch (error) {
    handleScheduleMutationError(
      res,
      error,
      "Error deleting schedule:",
      500,
      "Failed to delete schedule",
    )
  }
})

export default router
