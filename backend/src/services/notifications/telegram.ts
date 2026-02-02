import type {
  TelegramSettings,
  NotificationEvent,
} from "@snapraid-webui/shared";

/**
 * Send a notification to Telegram via Bot API
 */
export async function sendTelegramNotification(
  settings: TelegramSettings,
  event: NotificationEvent,
  title: string,
  message: string,
  details?: Record<string, string>
): Promise<boolean> {
  if (!settings.enabled || !settings.botToken || !settings.chatId) {
    return false;
  }

  // Emoji based on event type
  const emojis: Record<NotificationEvent, string> = {
    sync_complete: "✅",
    sync_error: "❌",
    sync_aborted: "⚠️",
    sync_safety_halt: "⚠️",
    scrub_complete: "✅",
    scrub_error: "❌",
    smart_warning: "⚠️",
    smart_failure: "🔴",
  };

  const emoji = emojis[event] || "📢";

  // Format message with HTML
  let text = `${emoji} <b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`;

  if (details) {
    text += "\n\n<b>Details:</b>";
    for (const [key, value] of Object.entries(details)) {
      text += `\n• <b>${escapeHtml(key)}:</b> ${escapeHtml(value)}`;
    }
  }

  const url = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Telegram API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Telegram notification error:", error);
    return false;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
