import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test"
import fs from "fs/promises"
import { existsSync } from "fs"

const TEST_APP_CONFIG = "/tmp/test-app-config-auth.json"

mock.module("../config", () => ({
  APP_CONFIG_FILE: TEST_APP_CONFIG,
  SNAPRAID_CONF_FILE: "/tmp/test.conf",
  SCHEDULES_FILE: "/tmp/test-schedules.json",
  LOGS_DIR: "/tmp/logs",
  PORT: 3000,
  CONFIG_PATH: "/tmp",
  SNAPRAID_BIN: "snapraid",
}))

const {
  loadAuthSettings,
  saveAuthSettings,
  isAuthEnabled,
  authMiddleware,
  hashPassword,
} = await import("./auth")

describe("auth settings", () => {
  beforeEach(async () => {
    if (existsSync(TEST_APP_CONFIG)) {
      await fs.unlink(TEST_APP_CONFIG)
    }
  })

  afterEach(async () => {
    if (existsSync(TEST_APP_CONFIG)) {
      await fs.unlink(TEST_APP_CONFIG)
    }
  })

  test("loadAuthSettings returns defaults when config is missing", async () => {
    const settings = await loadAuthSettings()
    expect(settings.enabled).toBe(false)
    expect(settings.username).toBe("admin")
    expect(settings.passwordHash).toBe("")
    expect(settings.sessionSecret.length).toBe(64)
  })

  test("saveAuthSettings persists updates", async () => {
    await saveAuthSettings({ enabled: true, username: "alice" })
    const settings = await loadAuthSettings()
    expect(settings.enabled).toBe(true)
    expect(settings.username).toBe("alice")
  })

  test("isAuthEnabled requires enabled and a password hash", async () => {
    await saveAuthSettings({ enabled: true, passwordHash: "" })
    expect(await isAuthEnabled()).toBe(false)

    const hash = await hashPassword("secret")
    await saveAuthSettings({ enabled: true, passwordHash: hash })
    expect(await isAuthEnabled()).toBe(true)
  })
})

describe("authMiddleware", () => {
  beforeEach(async () => {
    if (existsSync(TEST_APP_CONFIG)) {
      await fs.unlink(TEST_APP_CONFIG)
    }
  })

  afterEach(async () => {
    if (existsSync(TEST_APP_CONFIG)) {
      await fs.unlink(TEST_APP_CONFIG)
    }
  })

  test("allows requests when auth is disabled", async () => {
    await saveAuthSettings({ enabled: false, passwordHash: "" })
    const handler = authMiddleware()
    const next = mock(() => {})
    const req = {
      path: "/config",
      session: { authenticated: false },
    } as any
    const res = {
      status: () => res,
      json: () => res,
    } as any

    await handler(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  test("skips auth for /auth routes", async () => {
    const hash = await hashPassword("secret")
    await saveAuthSettings({ enabled: true, passwordHash: hash })
    const handler = authMiddleware()
    const next = mock(() => {})
    const req = {
      path: "/auth/login",
      session: { authenticated: false },
    } as any
    const res = {
      status: () => res,
      json: () => res,
    } as any

    await handler(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  test("returns 401 when auth is enabled and session is missing", async () => {
    const hash = await hashPassword("secret")
    await saveAuthSettings({ enabled: true, passwordHash: hash })
    const handler = authMiddleware()
    const next = mock(() => {})
    let statusCode = 200
    let payload: unknown = null
    const req = {
      path: "/config",
      session: { authenticated: false },
    } as any
    const res = {
      status: (code: number) => {
        statusCode = code
        return res
      },
      json: (body: unknown) => {
        payload = body
        return res
      },
    } as any

    await handler(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(statusCode).toBe(401)
    expect(payload).toEqual({ error: "Authentication required" })
  })

  test("allows requests when session is authenticated", async () => {
    const hash = await hashPassword("secret")
    await saveAuthSettings({ enabled: true, passwordHash: hash })
    const handler = authMiddleware()
    const next = mock(() => {})
    const req = {
      path: "/config",
      session: { authenticated: true },
    } as any
    const res = {
      status: () => res,
      json: () => res,
    } as any

    await handler(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
