import { Router, type IRouter } from "express"
import {
  loadAdvancedSettings,
  saveAdvancedSettings,
} from "../services/advanced-settings.js"

const router: IRouter = Router()

/**
 * GET /api/advanced/settings
 * Get advanced settings
 */
router.get("/settings", async (_req, res) => {
  try {
    const settings = await loadAdvancedSettings()
    res.json(settings)
  } catch (error) {
    console.error("Error getting advanced settings:", error)
    res.status(500).json({ error: "Failed to get advanced settings" })
  }
})

/**
 * PUT /api/advanced/settings
 * Update advanced settings
 */
router.put("/settings", async (req, res) => {
  try {
    await saveAdvancedSettings(req.body)
    res.json({ success: true })
  } catch (error) {
    console.error("Error saving advanced settings:", error)
    res
      .status(500)
      .json({ success: false, error: "Failed to save advanced settings" })
  }
})

export default router
