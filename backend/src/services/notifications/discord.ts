import type { DiscordSettings, NotificationEvent } from "@snapraid-webui/shared"

/** Discord embed/field limits per Execute Webhook and Embed docs. */
const EMBED_TITLE_MAX = 256
const EMBED_DESCRIPTION_MAX = 4096
const EMBED_FIELD_NAME_MAX = 256
const EMBED_FIELD_VALUE_MAX = 1024
const EMBED_FIELDS_MAX = 25
const EMBED_TOTAL_MAX = 6000

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 3) + "..."
}

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  timestamp?: string
}

interface DiscordMessage {
  content?: string
  embeds?: DiscordEmbed[]
}

/**
 * Send a notification to Discord via webhook.
 * Uses Execute Webhook (POST with embeds). Payload respects Discord embed limits.
 * @see https://discord.com/developers/docs/resources/webhook#execute-webhook
 * @see https://discord.com/developers/docs/resources/channel#embed-object
 */
export async function sendDiscordNotification(
  settings: DiscordSettings,
  event: NotificationEvent,
  title: string,
  message: string,
  details?: Record<string, string>,
): Promise<boolean> {
  if (!settings.enabled || !settings.webhookUrl) {
    return false
  }

  // Color based on event type
  const colors: Record<NotificationEvent, number> = {
    sync_complete: 0x00ff00, // Green
    sync_error: 0xff0000, // Red
    sync_aborted: 0xffa500, // Orange
    sync_safety_halt: 0xffa500, // Orange
    scrub_complete: 0x00ff00, // Green
    scrub_error: 0xff0000, // Red
  }

  const embedTitle = truncate(title, EMBED_TITLE_MAX)
  let embedDescription = truncate(message, EMBED_DESCRIPTION_MAX)

  const fields =
    details &&
    Object.entries(details)
      .slice(0, EMBED_FIELDS_MAX)
      .map(([name, value]) => ({
        name: truncate(name, EMBED_FIELD_NAME_MAX),
        value: truncate(value, EMBED_FIELD_VALUE_MAX),
        inline: true as const,
      }))

  const totalLength =
    embedTitle.length +
    embedDescription.length +
    (fields ?? []).reduce((s, f) => s + f.name.length + f.value.length, 0)
  if (totalLength > EMBED_TOTAL_MAX && fields?.length) {
    const over = totalLength - EMBED_TOTAL_MAX
    if (embedDescription.length >= over) {
      embedDescription = truncate(
        embedDescription,
        Math.max(0, embedDescription.length - over),
      )
    } else {
      const drop = Math.min(
        fields.length,
        Math.ceil(
          (over - embedDescription.length) /
            (EMBED_FIELD_NAME_MAX + EMBED_FIELD_VALUE_MAX + 2),
        ) || 1,
      )
      fields.splice(-drop)
    }
  }

  const embed: DiscordEmbed = {
    title: embedTitle,
    description: embedDescription,
    color: colors[event] || 0x0099ff,
    timestamp: new Date().toISOString(),
    ...(fields?.length ? { fields } : {}),
  }

  const payload: DiscordMessage = {
    embeds: [embed],
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
        `Discord webhook failed: ${response.status} ${response.statusText}`,
        body !== undefined ? body : "",
      )
      return false
    }

    return true
  } catch (error) {
    console.error("Discord notification error:", error)
    return false
  }
}
