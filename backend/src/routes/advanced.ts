import { Router, type IRouter } from "express"
import {
  loadAdvancedSettings,
  saveAdvancedSettings,
} from "../services/advanced-settings"
import { asyncHandler } from "../middleware/async-handler"

const router: IRouter = Router()

/**
 * GET /api/advanced/settings
 * Get advanced settings
 */
router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    const settings = await loadAdvancedSettings()
    res.json(settings)
  }),
)

/**
 * PUT /api/advanced/settings
 * Update advanced settings
 */
router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    await saveAdvancedSettings(req.body)
    res.json({ success: true })
  }),
)

export default router
