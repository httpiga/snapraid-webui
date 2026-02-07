import { Router, type IRouter } from "express"
import fs from "fs/promises"
import { existsSync } from "fs"
import { SNAPRAID_CONF_FILE } from "../config.js"
import {
  parseSnapRaidConfig,
  serializeSnapRaidConfig,
  validateSnapRaidConfig,
} from "../services/config-parser.js"
import type { ParsedSnapRaidConfig } from "@snapraid-webui/shared"

const router: IRouter = Router()

/**
 * GET /api/config
 * Get the parsed SnapRAID configuration
 */
router.get("/", async (_req, res) => {
  try {
    const config = await parseSnapRaidConfig(SNAPRAID_CONF_FILE)
    res.json(config)
  } catch (error) {
    console.error("Error reading config:", error)
    res.status(500).json({ error: "Failed to read configuration" })
  }
})

/**
 * GET /api/config/raw
 * Get the raw snapraid.conf file content
 */
router.get("/raw", async (_req, res) => {
  try {
    if (!existsSync(SNAPRAID_CONF_FILE)) {
      res.json("")
      return
    }
    const content = await fs.readFile(SNAPRAID_CONF_FILE, "utf-8")
    res.json(content)
  } catch (error) {
    console.error("Error reading raw config:", error)
    res.status(500).json({ error: "Failed to read configuration file" })
  }
})

/**
 * PUT /api/config
 * Update the SnapRAID configuration (parsed format)
 */
router.put("/", async (req, res) => {
  try {
    const config = req.body as ParsedSnapRaidConfig

    // Validate configuration
    const validation = validateSnapRaidConfig(config)
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: "Invalid configuration",
        details: validation.errors,
      })
      return
    }

    // Serialize and write
    const content = serializeSnapRaidConfig(config)
    await fs.writeFile(SNAPRAID_CONF_FILE, content, "utf-8")

    res.json({
      success: true,
      warnings: validation.errors.filter((e) => e.startsWith("Warning")),
    })
  } catch (error) {
    console.error("Error writing config:", error)
    res
      .status(500)
      .json({ success: false, error: "Failed to write configuration" })
  }
})

/**
 * PUT /api/config/raw
 * Update the raw snapraid.conf file content
 */
router.put("/raw", async (req, res) => {
  try {
    const { content } = req.body as { content: string }

    if (typeof content !== "string") {
      res
        .status(400)
        .json({ success: false, error: "Content must be a string" })
      return
    }

    await fs.writeFile(SNAPRAID_CONF_FILE, content, "utf-8")
    res.json({ success: true })
  } catch (error) {
    console.error("Error writing raw config:", error)
    res
      .status(500)
      .json({ success: false, error: "Failed to write configuration file" })
  }
})

/**
 * POST /api/config/validate
 * Validate a SnapRAID configuration without saving
 */
router.post("/validate", async (req, res) => {
  try {
    const config = req.body as ParsedSnapRaidConfig
    const validation = validateSnapRaidConfig(config)
    res.json(validation)
  } catch (error) {
    console.error("Error validating config:", error)
    res
      .status(500)
      .json({ valid: false, errors: ["Failed to validate configuration"] })
  }
})

export default router
