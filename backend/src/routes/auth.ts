import { Router, type IRouter } from "express"
import {
  loadAuthSettings,
  saveAuthSettings,
  hashPassword,
  isAuthEnabled,
  login,
} from "../middleware/auth.js"

const router: IRouter = Router()

/**
 * GET /api/auth/status
 * Get authentication status
 */
router.get("/status", async (req, res) => {
  const enabled = await isAuthEnabled()

  res.json({
    enabled,
    authenticated: enabled ? !!req.session?.authenticated : true,
    username: req.session?.username || null,
  })
})

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    res
      .status(400)
      .json({ success: false, error: "Username and password required" })
    return
  }

  const success = await login(username, password)

  if (success) {
    req.session.authenticated = true
    req.session.username = username
    res.json({ success: true })
  } else {
    res.status(401).json({ success: false, error: "Invalid credentials" })
  }
})

/**
 * POST /api/auth/logout
 * Logout and destroy session
 */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ success: false, error: "Failed to logout" })
    } else {
      res.json({ success: true })
    }
  })
})

/**
 * GET /api/auth/settings
 * Get auth settings (without password hash)
 */
router.get("/settings", async (req, res) => {
  // Only allow access if already authenticated or auth is disabled
  const enabled = await isAuthEnabled()
  if (enabled && !req.session?.authenticated) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  const settings = await loadAuthSettings()
  res.json({
    enabled: settings.enabled,
    username: settings.username,
    hasPassword: settings.passwordHash !== "",
    // Don't send password hash
  })
})

/**
 * PUT /api/auth/settings
 * Update auth settings
 */
router.put("/settings", async (req, res) => {
  // Only allow access if already authenticated or auth is disabled
  const enabled = await isAuthEnabled()
  if (enabled && !req.session?.authenticated) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  const { enabled: newEnabled, username, password } = req.body

  try {
    const currentSettings = await loadAuthSettings()
    const enabling =
      newEnabled === true ||
      (newEnabled === undefined && currentSettings.enabled)
    const hasPassword = currentSettings.passwordHash !== ""

    if (enabling && !hasPassword && !password) {
      res.status(400).json({
        success: false,
        error: "Password required when enabling authentication",
      })
      return
    }

    const updates: Record<string, unknown> = {}

    if (newEnabled !== undefined) {
      updates.enabled = newEnabled
    }

    if (username) {
      updates.username = username
    }

    if (password) {
      updates.passwordHash = await hashPassword(password)
    }

    await saveAuthSettings(updates)
    res.json({ success: true })
  } catch (error) {
    console.error("Error updating auth settings:", error)
    res.status(500).json({ success: false, error: "Failed to update settings" })
  }
})

export default router
