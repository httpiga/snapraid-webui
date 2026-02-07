import { Router, type IRouter } from "express"
import {
  loadSyncSafetySettings,
  saveSyncSafetySettings,
} from "../services/sync-safety"

const router: IRouter = Router()

/**
 * GET /api/sync-safety/settings
 * Get sync safety settings
 */
router.get("/settings", async (_req, res) => {
  try {
    const settings = await loadSyncSafetySettings()
    res.json(settings)
  } catch (error) {
    console.error("Error getting sync safety settings:", error)
    res.status(500).json({ error: "Failed to get sync safety settings" })
  }
})

/**
 * PUT /api/sync-safety/settings
 * Update sync safety settings
 */
router.put("/settings", async (req, res) => {
  try {
    await saveSyncSafetySettings(req.body)
    res.json({ success: true })
  } catch (error) {
    console.error("Error saving sync safety settings:", error)
    res
      .status(500)
      .json({ success: false, error: "Failed to save sync safety settings" })
  }
})

export default router
