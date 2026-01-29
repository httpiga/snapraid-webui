import { Router } from "express";
import {
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../services/scheduler.js";

const router = Router();

/**
 * GET /api/schedules
 * List all schedules
 */
router.get("/", async (_req, res) => {
  try {
    const schedules = await getSchedules();
    res.json(schedules);
  } catch (error) {
    console.error("Error getting schedules:", error);
    res.status(500).json({ error: "Failed to get schedules" });
  }
});

/**
 * GET /api/schedules/:id
 * Get a specific schedule
 */
router.get("/:id", async (req, res) => {
  try {
    const schedule = await getSchedule(req.params.id);

    if (!schedule) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    res.json(schedule);
  } catch (error) {
    console.error("Error getting schedule:", error);
    res.status(500).json({ error: "Failed to get schedule" });
  }
});

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
    } = req.body;

    // Validate required fields
    if (!name || !command || !cronExpression) {
      res
        .status(400)
        .json({
          error: "Missing required fields: name, command, cronExpression",
        });
      return;
    }

    const schedule = await createSchedule({
      name,
      command,
      configPath: configPath || "",
      args,
      cronExpression,
      enabled,
    });

    res.status(201).json(schedule);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create schedule";
    console.error("Error creating schedule:", error);
    res.status(400).json({ error: message });
  }
});

/**
 * PUT /api/schedules/:id
 * Update a schedule
 */
router.put("/:id", async (req, res) => {
  try {
    const schedule = await updateSchedule(req.params.id, req.body);
    res.json(schedule);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update schedule";
    console.error("Error updating schedule:", error);

    if (message.includes("not found")) {
      res.status(404).json({ error: message });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

/**
 * DELETE /api/schedules/:id
 * Delete a schedule
 */
router.delete("/:id", async (req, res) => {
  try {
    await deleteSchedule(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete schedule";
    console.error("Error deleting schedule:", error);

    if (message.includes("not found")) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

export default router;
