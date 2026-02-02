import type { SlackSettings, NotificationEvent } from "@snapraid-webui/shared";

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: Array<{
    color: string;
    blocks: SlackBlock[];
  }>;
}

/**
 * Send a notification to Slack via webhook
 */
export async function sendSlackNotification(
  settings: SlackSettings,
  event: NotificationEvent,
  title: string,
  message: string,
  details?: Record<string, string>
): Promise<boolean> {
  if (!settings.enabled || !settings.webhookUrl) {
    return false;
  }

  // Color based on event type
  const colors: Record<NotificationEvent, string> = {
    sync_complete: "#36a64f", // Green
    sync_error: "#ff0000", // Red
    sync_aborted: "#ff9800", // Orange
    sync_safety_halt: "#ff9800", // Orange
    scrub_complete: "#36a64f", // Green
    scrub_error: "#ff0000", // Red
  };

  // Emoji based on event type
  const emojis: Record<NotificationEvent, string> = {
    sync_complete: ":white_check_mark:",
    sync_error: ":x:",
    sync_aborted: ":warning:",
    sync_safety_halt: ":warning:",
    scrub_complete: ":white_check_mark:",
    scrub_error: ":x:",
  };

  const emoji = emojis[event] || ":bell:";

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
  ];

  if (details && Object.keys(details).length > 0) {
    const fields = Object.entries(details).map(([key, value]) => ({
      type: "mrkdwn" as const,
      text: `*${key}:*\n${value}`,
    }));

    blocks.push({
      type: "section",
      fields,
    });
  }

  const payload: SlackMessage = {
    text: `${title}\n${message}`,
    attachments: [
      {
        color: colors[event] || "#0099ff",
        blocks,
      },
    ],
  };

  try {
    const response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `Slack webhook failed: ${response.status} ${response.statusText}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Slack notification error:", error);
    return false;
  }
}
