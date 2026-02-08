import type { SlackSettings, NotificationEvent } from "@snapraid-webui/shared"

/** Max length for top-level fallback text (Slack recommends ≤4000). */
const TEXT_MAX = 4000
/** Section block fields array limit (Block Kit). */
const SECTION_FIELDS_MAX = 10
/** Max length per section field text (Block Kit). */
const SECTION_FIELD_TEXT_MAX = 2000

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 3) + "..."
}

interface SlackBlock {
  type: string
  text?: {
    type: string
    text: string
    emoji?: boolean
  }
  fields?: Array<{
    type: string
    text: string
  }>
}

interface SlackMessage {
  text?: string
  blocks?: SlackBlock[]
  attachments?: Array<{
    color: string
    blocks: SlackBlock[]
  }>
}

/**
 * Send a notification to Slack via incoming webhook.
 * @see https://api.slack.com/messaging/webhooks
 */
export async function sendSlackNotification(
  settings: SlackSettings,
  event: NotificationEvent,
  title: string,
  message: string,
  details?: Record<string, string>,
): Promise<boolean> {
  if (!settings.enabled || !settings.webhookUrl) {
    return false
  }

  // Color based on event type
  const colors: Record<NotificationEvent, string> = {
    sync_complete: "#36a64f", // Green
    sync_error: "#ff0000", // Red
    sync_aborted: "#ff9800", // Orange
    sync_safety_halt: "#ff9800", // Orange
    scrub_complete: "#36a64f", // Green
    scrub_error: "#ff0000", // Red
  }

  // Emoji based on event type
  const emojis: Record<NotificationEvent, string> = {
    sync_complete: ":white_check_mark:",
    sync_error: ":x:",
    sync_aborted: ":warning:",
    sync_safety_halt: ":warning:",
    scrub_complete: ":white_check_mark:",
    scrub_error: ":x:",
  }

  const emoji = emojis[event] || ":bell:"

  const fallbackText = truncate(`${emoji} ${title}\n${message}`, TEXT_MAX)

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${title}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: message,
      },
    },
  ]

  if (details) {
    const fields = Object.entries(details)
      .slice(0, SECTION_FIELDS_MAX)
      .map(([key, value]) => ({
        type: "mrkdwn" as const,
        text: truncate(`*${key}:*\n${value}`, SECTION_FIELD_TEXT_MAX),
      }))

    blocks.push({
      type: "section",
      fields,
    })
  }

  const payload: SlackMessage = {
    text: fallbackText,
    attachments: [
      {
        color: colors[event] || "#0099ff",
        blocks,
      },
    ],
  }

  try {
    const response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let body: string | undefined
      try {
        body = await response.text()
        try {
          const parsed = JSON.parse(body) as unknown
          if (parsed && typeof parsed === "object") {
            body = JSON.stringify(parsed)
          }
        } catch {
          // not JSON, keep body as-is
        }
      } catch {
        body = undefined
      }
      console.error(
        `Slack webhook failed: ${response.status} ${response.statusText}`,
        body !== undefined ? body : "",
      )
      return false
    }

    return true
  } catch (error) {
    console.error("Slack notification error:", error)
    return false
  }
}
