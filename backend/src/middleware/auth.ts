import { Request, Response, NextFunction, type RequestHandler } from "express"
import session from "express-session"
import bcrypt from "bcryptjs"
import fs from "fs/promises"
import { existsSync } from "fs"
import { APP_CONFIG_FILE } from "../config.js"
import type { AuthSettings } from "@snapraid-webui/shared"

// Extend Express session
declare module "express-session" {
  interface SessionData {
    authenticated: boolean
    username: string
  }
}

// Default auth settings (disabled by default)
const defaultAuthSettings: AuthSettings = {
  enabled: false,
  username: "admin",
  passwordHash: "",
  sessionSecret: generateSessionSecret(),
}

/**
 * Generate a random session secret
 */
function generateSessionSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Load auth settings from app config
 */
export async function loadAuthSettings(): Promise<AuthSettings> {
  // Check environment variables first
  if (process.env.AUTH_ENABLED === "true") {
    return {
      enabled: true,
      username: process.env.AUTH_USERNAME || "admin",
      passwordHash: process.env.AUTH_PASSWORD_HASH || "",
      sessionSecret: process.env.SESSION_SECRET || generateSessionSecret(),
    }
  }

  if (!existsSync(APP_CONFIG_FILE)) {
    return defaultAuthSettings
  }

  try {
    const content = await fs.readFile(APP_CONFIG_FILE, "utf-8")
    const config = JSON.parse(content)
    return config.auth || defaultAuthSettings
  } catch {
    return defaultAuthSettings
  }
}

/**
 * Save auth settings to app config
 */
export async function saveAuthSettings(
  settings: Partial<AuthSettings>,
): Promise<void> {
  let config: Record<string, unknown> = {}

  if (existsSync(APP_CONFIG_FILE)) {
    const content = await fs.readFile(APP_CONFIG_FILE, "utf-8")
    config = JSON.parse(content)
  }

  const currentSettings = (config.auth as AuthSettings) || defaultAuthSettings
  config.auth = { ...currentSettings, ...settings }

  await fs.writeFile(APP_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8")
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Check if authentication is enabled
 */
export async function isAuthEnabled(): Promise<boolean> {
  const settings = await loadAuthSettings()
  return settings.enabled && settings.passwordHash !== ""
}

/**
 * Create session middleware
 */
export async function createSessionMiddleware(): Promise<RequestHandler> {
  const settings = await loadAuthSettings()

  return session({
    secret: settings.sessionSecret || generateSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
}

/**
 * Authentication middleware
 * Skips auth check if auth is disabled
 */
export function authMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip auth for auth endpoints (router handles its own checks)
    if (req.path.startsWith("/auth/")) {
      return next()
    }

    // Check if auth is enabled
    const enabled = await isAuthEnabled()
    if (!enabled) {
      return next()
    }

    // Check if authenticated
    if (req.session?.authenticated) {
      return next()
    }

    res.status(401).json({ error: "Authentication required" })
  }
}

/**
 * Login handler
 */
export async function login(
  username: string,
  password: string,
): Promise<boolean> {
  const settings = await loadAuthSettings()

  if (!settings.enabled) {
    return true
  }

  if (username !== settings.username) {
    return false
  }

  return verifyPassword(password, settings.passwordHash)
}
