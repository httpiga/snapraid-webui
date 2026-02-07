import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import fs from "fs/promises"
import { mkdtempSync, existsSync } from "fs"
import path from "path"
import { tmpdir } from "os"
import { silenceConsole } from "../../test-utils/silence-console"
import { NOTIFICATION_EVENTS } from "@snapraid-webui/shared"
const { mock } = await import("bun:test")
const tmpDir = mkdtempSync(path.join(tmpdir(), "notif-"))
process.env.CONFIG_PATH = tmpDir
const configModule = await import("../../config")
const configPath =
  configModule.APP_CONFIG_FILE || path.join(tmpDir, "app-config.json")

const fetchCalls: Array<{ url: string; options: RequestInit }> = []
let fetchResponder: (url: string) => {
  ok: boolean
  status: number
  statusText: string
}
const mailCalls: Array<unknown[]> = []

mock.module("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (...args: unknown[]) => {
        mailCalls.push(args)
      },
    }),
  },
}))

const notifications = await import("./index")
const originalFetch = globalThis.fetch

beforeEach(() => {
  fetchCalls.length = 0
  mailCalls.length = 0
  fetchResponder = () => ({
    ok: true,
    status: 200,
    statusText: "OK",
  })
  globalThis.fetch = (async (url: string, options: RequestInit) => {
    fetchCalls.push({ url, options })
    const response = fetchResponder(url)
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      json: async () => ({ ok: response.ok }),
    } as Response
  }) as typeof fetch
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  if (existsSync(configPath)) {
    await fs.unlink(configPath)
  }
})

describe("getOperationNotificationPayload", () => {
  test("returns null for check command", () => {
    expect(notifications.getOperationNotificationPayload("check", 0)).toBeNull()
    expect(notifications.getOperationNotificationPayload("check", 1)).toBeNull()
  })

  test("returns null for fix command", () => {
    expect(notifications.getOperationNotificationPayload("fix", 0)).toBeNull()
  })

  test("sync exit 0 returns sync_complete", () => {
    const payload = notifications.getOperationNotificationPayload("sync", 0)
    expect(payload).not.toBeNull()
    expect(payload!.event).toBe("sync_complete")
    expect(payload!.title).toBe("Sync completed")
    expect(payload!.message).toContain("successfully")
    expect(payload!.details).not.toHaveProperty("Command")
    expect(payload!.details).not.toHaveProperty("Exit code")
    expect(payload!.details.Source).toBe("Manual")
  })

  test("sync exit 0 with schedule name includes schedule in details", () => {
    const payload = notifications.getOperationNotificationPayload("sync", 0, {
      scheduleName: "Nightly Sync",
    })
    expect(payload).not.toBeNull()
    expect(payload!.details.Source).toBe("Scheduled: Nightly Sync")
  })

  test("sync non-zero exit returns sync_error with exit code in details", () => {
    const payload = notifications.getOperationNotificationPayload("sync", 1)
    expect(payload).not.toBeNull()
    expect(payload!.event).toBe("sync_error")
    expect(payload!.title).toBe("Sync failed")
    expect(payload!.message).toContain("exit code 1")
    expect(payload!.details["Exit code"]).toBe("1")
  })

  test("sync aborted by SIGTERM returns sync_aborted with exit code in details", () => {
    const sigterm = 128 + 15
    const payload = notifications.getOperationNotificationPayload(
      "sync",
      sigterm,
    )
    expect(payload).not.toBeNull()
    expect(payload!.event).toBe("sync_aborted")
    expect(payload!.title).toBe("Sync aborted")
    expect(payload!.details["Exit code"]).toBe(String(sigterm))
  })

  test("sync aborted by SIGINT returns sync_aborted with exit code in details", () => {
    const sigint = 128 + 2
    const payload = notifications.getOperationNotificationPayload(
      "sync",
      sigint,
    )
    expect(payload).not.toBeNull()
    expect(payload!.event).toBe("sync_aborted")
    expect(payload!.details["Exit code"]).toBe(String(sigint))
  })

  test("sync exit 0 with diffOutput includes pre-sync diff in details", () => {
    const diffOutput =
      "=== Checking Sync Safety ===\nRunning diff...\n\n 1 removed"
    const payload = notifications.getOperationNotificationPayload("sync", 0, {
      diffOutput,
    })
    expect(payload).not.toBeNull()
    expect(payload!.details["Pre-sync diff"]).toBe(diffOutput)
  })

  test("sync with empty diffOutput does not add Pre-sync diff to details", () => {
    const payload = notifications.getOperationNotificationPayload("sync", 0, {
      diffOutput: "   \n  ",
    })
    expect(payload).not.toBeNull()
    expect(payload!.details).not.toHaveProperty("Pre-sync diff")
  })

  test("scrub exit 0 returns scrub_complete without exit code in details", () => {
    const payload = notifications.getOperationNotificationPayload("scrub", 0)
    expect(payload).not.toBeNull()
    expect(payload!.event).toBe("scrub_complete")
    expect(payload!.title).toBe("Scrub completed")
    expect(payload!.details).not.toHaveProperty("Exit code")
  })

  test("scrub non-zero returns scrub_error with exit code in details", () => {
    const payload = notifications.getOperationNotificationPayload("scrub", 2)
    expect(payload).not.toBeNull()
    expect(payload!.event).toBe("scrub_error")
    expect(payload!.title).toBe("Scrub failed")
    expect(payload!.details["Exit code"]).toBe("2")
  })

  test("scrub SIGTERM returns scrub_error with aborted message and exit code in details", () => {
    const sigterm = 128 + 15
    const payload = notifications.getOperationNotificationPayload(
      "scrub",
      sigterm,
    )
    expect(payload).not.toBeNull()
    expect(payload!.event).toBe("scrub_error")
    expect(payload!.title).toBe("Scrub aborted")
    expect(payload!.details["Exit code"]).toBe(String(sigterm))
  })
})

describe("loadNotificationSettings", () => {
  test("returns default settings when config file does not exist", async () => {
    const settings = await notifications.loadNotificationSettings()
    expect(settings.channels.discord.enabled).toBe(false)
    expect(settings.channels.telegram.enabled).toBe(false)
    expect(settings.channels.discord.events).toEqual(NOTIFICATION_EVENTS)
  })

  test("returns default settings when config is invalid JSON", async () => {
    await fs.writeFile(configPath, "{bad json", "utf-8")
    const settings = await notifications.loadNotificationSettings()
    expect(settings.channels.email.enabled).toBe(false)
    expect(settings.channels.slack.events).toEqual(NOTIFICATION_EVENTS)
  })

  test("migrates legacy events map into per-channel selections", async () => {
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          notifications: {
            channels: {
              discord: { enabled: true, webhookUrl: "http://discord" },
              telegram: { enabled: false, botToken: "", chatId: "" },
              email: {
                enabled: false,
                smtpHost: "",
                smtpPort: 587,
                smtpSecure: false,
                smtpUser: "",
                smtpPass: "",
                fromAddress: "",
                toAddresses: [],
              },
              slack: { enabled: true, webhookUrl: "http://slack" },
            },
            events: {
              sync_complete: ["discord", "slack"],
              scrub_error: ["slack"],
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    )
    const settings = await notifications.loadNotificationSettings()
    expect(settings.channels.discord.events).toEqual(["sync_complete"])
    expect(settings.channels.slack.events).toEqual([
      "sync_complete",
      "scrub_error",
    ])
  })
})

describe("saveNotificationSettings and loadNotificationSettings", () => {
  test("save then load round-trips settings", async () => {
    const settings = await notifications.loadNotificationSettings()
    expect(settings.channels.discord.enabled).toBe(false)
    settings.channels.discord.enabled = true
    settings.channels.discord.webhookUrl = "https://discord.com/webhook"
    await notifications.saveNotificationSettings(settings)
    expect(existsSync(configPath)).toBe(true)
    const content = await fs.readFile(configPath, "utf-8")
    const parsed = JSON.parse(content)
    expect(parsed.notifications.channels.discord.enabled).toBe(true)
    expect(parsed.notifications.channels.discord.webhookUrl).toBe(
      "https://discord.com/webhook",
    )
  })

  test("save preserves existing config keys", async () => {
    await fs.writeFile(
      configPath,
      JSON.stringify({ otherKey: "value" }, null, 2),
      "utf-8",
    )
    const settings = await notifications.loadNotificationSettings()
    await notifications.saveNotificationSettings(settings)
    const content = await fs.readFile(configPath, "utf-8")
    const parsed = JSON.parse(content)
    expect(parsed.otherKey).toBe("value")
    expect(parsed.notifications).toBeDefined()
  })
})

describe("sendNotification", () => {
  test("returns success false and all results false when no channels enabled", async () => {
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          notifications: {
            channels: {
              discord: {
                enabled: false,
                webhookUrl: "",
                events: [...NOTIFICATION_EVENTS],
              },
              telegram: {
                enabled: false,
                botToken: "",
                chatId: "",
                events: [...NOTIFICATION_EVENTS],
              },
              email: {
                enabled: false,
                smtpHost: "",
                smtpPort: 587,
                smtpSecure: false,
                smtpUser: "",
                smtpPass: "",
                fromAddress: "",
                toAddresses: [],
                events: [...NOTIFICATION_EVENTS],
              },
              slack: {
                enabled: false,
                webhookUrl: "",
                events: [...NOTIFICATION_EVENTS],
              },
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    )
    const result = await notifications.sendNotification(
      "sync_complete",
      "Title",
      "Message",
    )
    expect(result.success).toBe(false)
    expect(result.results.discord).toBe(false)
    expect(result.results.telegram).toBe(false)
    expect(result.results.email).toBe(false)
    expect(result.results.slack).toBe(false)
  })

  test("sends to enabled channels and records results", async () => {
    const restore = silenceConsole()
    fetchResponder = (url) => {
      if (url.includes("discord")) {
        return { ok: true, status: 204, statusText: "No Content" }
      }
      if (url.includes("slack")) {
        return { ok: false, status: 500, statusText: "Error" }
      }
      return { ok: true, status: 200, statusText: "OK" }
    }
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          notifications: {
            channels: {
              discord: {
                enabled: true,
                webhookUrl: "http://discord",
                events: ["sync_complete"],
              },
              telegram: {
                enabled: false,
                botToken: "",
                chatId: "",
                events: [...NOTIFICATION_EVENTS],
              },
              email: {
                enabled: false,
                smtpHost: "",
                smtpPort: 587,
                smtpSecure: false,
                smtpUser: "",
                smtpPass: "",
                fromAddress: "",
                toAddresses: [],
                events: [...NOTIFICATION_EVENTS],
              },
              slack: {
                enabled: true,
                webhookUrl: "http://slack",
                events: ["sync_complete"],
              },
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    )
    const result = await notifications.sendNotification(
      "sync_complete",
      "Title",
      "Message",
      { Key: "Value" },
    )
    expect(result.success).toBe(true)
    expect(result.results.discord).toBe(true)
    expect(result.results.slack).toBe(false)
    expect(fetchCalls.length).toBe(2)
    restore()
  })

  test("skips enabled channels when event is not selected", async () => {
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          notifications: {
            channels: {
              discord: {
                enabled: true,
                webhookUrl: "http://discord",
                events: ["sync_complete"],
              },
              telegram: {
                enabled: false,
                botToken: "",
                chatId: "",
                events: [...NOTIFICATION_EVENTS],
              },
              email: {
                enabled: false,
                smtpHost: "",
                smtpPort: 587,
                smtpSecure: false,
                smtpUser: "",
                smtpPass: "",
                fromAddress: "",
                toAddresses: [],
                events: [...NOTIFICATION_EVENTS],
              },
              slack: {
                enabled: true,
                webhookUrl: "http://slack",
                events: ["scrub_error"],
              },
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    )
    const result = await notifications.sendNotification(
      "sync_complete",
      "Title",
      "Message",
    )
    expect(result.results.discord).toBe(true)
    expect(result.results.slack).toBe(false)
    expect(fetchCalls.length).toBe(1)
  })
})

describe("testNotificationChannel", () => {
  test("returns false when channel not configured (e.g. discord)", async () => {
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          notifications: {
            channels: {
              discord: {
                enabled: false,
                webhookUrl: "",
                events: [...NOTIFICATION_EVENTS],
              },
              telegram: {
                enabled: false,
                botToken: "",
                chatId: "",
                events: [...NOTIFICATION_EVENTS],
              },
              email: {
                enabled: false,
                smtpHost: "",
                smtpPort: 587,
                smtpSecure: false,
                smtpUser: "",
                smtpPass: "",
                fromAddress: "",
                toAddresses: [],
                events: [...NOTIFICATION_EVENTS],
              },
              slack: {
                enabled: false,
                webhookUrl: "",
                events: [...NOTIFICATION_EVENTS],
              },
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    )
    const result = await notifications.testNotificationChannel("discord")
    expect(result).toBe(false)
  })

  test("returns false for telegram when not configured", async () => {
    const result = await notifications.testNotificationChannel("telegram")
    expect(result).toBe(false)
  })

  test("returns true when email sender succeeds", async () => {
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          notifications: {
            channels: {
              discord: {
                enabled: false,
                webhookUrl: "",
                events: [...NOTIFICATION_EVENTS],
              },
              telegram: {
                enabled: false,
                botToken: "",
                chatId: "",
                events: [...NOTIFICATION_EVENTS],
              },
              email: {
                enabled: true,
                smtpHost: "smtp.test",
                smtpPort: 587,
                smtpSecure: false,
                smtpUser: "",
                smtpPass: "",
                fromAddress: "from@test",
                toAddresses: ["to@test"],
                events: [...NOTIFICATION_EVENTS],
              },
              slack: {
                enabled: false,
                webhookUrl: "",
                events: [...NOTIFICATION_EVENTS],
              },
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    )
    const result = await notifications.testNotificationChannel("email")
    expect(result).toBe(true)
    expect(mailCalls.length).toBe(1)
  })

  test("returns true when slack sender succeeds", async () => {
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          notifications: {
            channels: {
              discord: {
                enabled: false,
                webhookUrl: "",
                events: [...NOTIFICATION_EVENTS],
              },
              telegram: {
                enabled: false,
                botToken: "",
                chatId: "",
                events: [...NOTIFICATION_EVENTS],
              },
              email: {
                enabled: false,
                smtpHost: "",
                smtpPort: 587,
                smtpSecure: false,
                smtpUser: "",
                smtpPass: "",
                fromAddress: "",
                toAddresses: [],
                events: [...NOTIFICATION_EVENTS],
              },
              slack: {
                enabled: true,
                webhookUrl: "http://slack",
                events: [...NOTIFICATION_EVENTS],
              },
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    )
    const result = await notifications.testNotificationChannel("slack")
    expect(result).toBe(true)
    expect(fetchCalls.length).toBe(1)
  })
})
