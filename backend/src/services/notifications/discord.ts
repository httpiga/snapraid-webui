import type { DiscordSettings, NotificationEvent } from "@snapraid-webui/shared"

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
 * Send a notification to Discord via webhook
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

  const embed: DiscordEmbed = {
    title,
    description: message,
    color: colors[event] || 0x0099ff,
    timestamp: new Date().toISOString(),
  }

  if (details) {
    embed.fields = Object.entries(details).map(([name, value]) => ({
      name,
      value,
      inline: true,
    }))
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
      console.error(
        `Discord webhook failed: ${response.status} ${response.statusText}`,
      )
      return false
    }

    return true
  } catch (error) {
    console.error("Discord notification error:", error)
    return false
  }
}
