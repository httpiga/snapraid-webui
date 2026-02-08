import { describe, test, expect, beforeEach } from "bun:test"
import { NOTIFICATION_EVENTS } from "@snapraid-webui/shared"
import type { EmailSettings } from "@snapraid-webui/shared"
import { silenceConsole } from "src/test-utils/silence-console"

const mailCalls: unknown[][] = []
let verifyCalls = 0
let sendMailShouldThrow = false

const { mock } = await import("bun:test")
mock.module("nodemailer", () => ({
  default: {
    createTransport: () => ({
      verify: async () => {
        verifyCalls += 1
      },
      sendMail: async (...args: unknown[]) => {
        if (sendMailShouldThrow) {
          throw Object.assign(new Error("SMTP error"), {
            code: "ESOCKET",
            response: "Connection refused",
          })
        }
        mailCalls.push(args)
      },
    }),
  },
}))

const { sendEmailNotification } = await import("./email")

function baseSettings(overrides: Partial<EmailSettings> = {}): EmailSettings {
  return {
    enabled: true,
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "user",
    smtpPass: "pass",
    fromAddress: "from@example.com",
    toAddresses: ["to@example.com"],
    events: [...NOTIFICATION_EVENTS],
    ...overrides,
  }
}

beforeEach(() => {
  mailCalls.length = 0
  verifyCalls = 0
  sendMailShouldThrow = false
})

describe("sendEmailNotification", () => {
  test("returns false when disabled", async () => {
    const result = await sendEmailNotification(
      baseSettings({ enabled: false }),
      "sync_complete",
      "Title",
      "Message",
    )
    expect(result).toBe(false)
    expect(mailCalls.length).toBe(0)
  })

  test("returns false when smtpHost is empty", async () => {
    const result = await sendEmailNotification(
      baseSettings({ smtpHost: "" }),
      "sync_complete",
      "Title",
      "Message",
    )
    expect(result).toBe(false)
    expect(mailCalls.length).toBe(0)
  })

  test("returns false when toAddresses is empty", async () => {
    const result = await sendEmailNotification(
      baseSettings({ toAddresses: [] }),
      "sync_complete",
      "Title",
      "Message",
    )
    expect(result).toBe(false)
    expect(mailCalls.length).toBe(0)
  })

  test("returns true and calls sendMail once with expected from, to, subject and body when settings are valid", async () => {
    const settings = baseSettings({
      fromAddress: "sender@test.com",
      toAddresses: ["a@test.com", "b@test.com"],
    })
    const result = await sendEmailNotification(
      settings,
      "sync_complete",
      "Test Title",
      "Test message",
      { Key: "Value" },
    )
    expect(result).toBe(true)
    expect(mailCalls.length).toBe(1)
    const [mailOptions] = mailCalls[0] as [Record<string, unknown>]
    expect(mailOptions.from).toBe("sender@test.com")
    expect(mailOptions.to).toBe("a@test.com, b@test.com")
    expect(mailOptions.subject).toBe("[OK] SnapRAID: Test Title")
    expect(typeof mailOptions.text).toBe("string")
    expect((mailOptions.text as string).includes("Test Title")).toBe(true)
    expect((mailOptions.text as string).includes("Key: Value")).toBe(true)
    expect(typeof mailOptions.html).toBe("string")
    expect((mailOptions.html as string).includes("Test Title")).toBe(true)
    expect((mailOptions.html as string).includes("Key")).toBe(true)
    expect((mailOptions.html as string).includes("Value")).toBe(true)
  })

  test("returns false when sendMail throws", async () => {
    sendMailShouldThrow = true
    const restore = silenceConsole()
    const result = await sendEmailNotification(
      baseSettings(),
      "sync_error",
      "Title",
      "Message",
    )
    restore()
    expect(result).toBe(false)
  })

  test("calls verify before sendMail when verifyConnection is true", async () => {
    const result = await sendEmailNotification(
      baseSettings(),
      "sync_complete",
      "Test",
      "Message",
      undefined,
      { verifyConnection: true },
    )
    expect(result).toBe(true)
    expect(verifyCalls).toBe(1)
    expect(mailCalls.length).toBe(1)
  })
})
