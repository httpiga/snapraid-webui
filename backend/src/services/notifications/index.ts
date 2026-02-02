import fs from "fs/promises";
import { existsSync } from "fs";
import type {
  NotificationSettings,
  NotificationEvent,
  NotificationChannel,
  SnapRaidCommand,
} from "@snapraid-webui/shared";
import { NOTIFICATION_EVENTS } from "@snapraid-webui/shared";
import { APP_CONFIG_FILE } from "../../config.js";
import { sendDiscordNotification } from "./discord.js";
import { sendTelegramNotification } from "./telegram.js";
import { sendEmailNotification } from "./email.js";
import { sendSlackNotification } from "./slack.js";

// Default notification settings
const defaultSettings: NotificationSettings = {
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
    slack: { enabled: false, webhookUrl: "", events: [...NOTIFICATION_EVENTS] },
  },
};

type LegacyNotificationSettings = Partial<NotificationSettings> & {
  events?: Partial<Record<NotificationEvent, NotificationChannel[]>>;
};

function normalizeNotificationSettings(
  settings: LegacyNotificationSettings | undefined,
): NotificationSettings {
  if (!settings) {
    return defaultSettings;
  }

  const legacyEvents = settings.events;
  const getLegacyEventsForChannel = (channel: NotificationChannel) =>
    NOTIFICATION_EVENTS.filter((event) =>
      legacyEvents?.[event]?.includes(channel),
    );

  return {
    channels: {
      discord: {
        ...defaultSettings.channels.discord,
        ...settings.channels?.discord,
        events: settings.channels?.discord?.events?.length
          ? settings.channels.discord.events
          : getLegacyEventsForChannel("discord").length
            ? getLegacyEventsForChannel("discord")
            : defaultSettings.channels.discord.events,
      },
      telegram: {
        ...defaultSettings.channels.telegram,
        ...settings.channels?.telegram,
        events: settings.channels?.telegram?.events?.length
          ? settings.channels.telegram.events
          : getLegacyEventsForChannel("telegram").length
            ? getLegacyEventsForChannel("telegram")
            : defaultSettings.channels.telegram.events,
      },
      email: {
        ...defaultSettings.channels.email,
        ...settings.channels?.email,
        events: settings.channels?.email?.events?.length
          ? settings.channels.email.events
          : getLegacyEventsForChannel("email").length
            ? getLegacyEventsForChannel("email")
            : defaultSettings.channels.email.events,
      },
      slack: {
        ...defaultSettings.channels.slack,
        ...settings.channels?.slack,
        events: settings.channels?.slack?.events?.length
          ? settings.channels.slack.events
          : getLegacyEventsForChannel("slack").length
            ? getLegacyEventsForChannel("slack")
            : defaultSettings.channels.slack.events,
      },
    },
  };
}

/**
 * Load notification settings from app config
 */
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  if (!existsSync(APP_CONFIG_FILE)) {
    return defaultSettings;
  }

  try {
    const content = await fs.readFile(APP_CONFIG_FILE, "utf-8");
    const config = JSON.parse(content);
    return normalizeNotificationSettings(config.notifications);
  } catch {
    return defaultSettings;
  }
}

/**
 * Save notification settings to app config
 */
export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<void> {
  let config: Record<string, unknown> = {};

  if (existsSync(APP_CONFIG_FILE)) {
    const content = await fs.readFile(APP_CONFIG_FILE, "utf-8");
    config = JSON.parse(content);
  }

  config.notifications = settings;
  await fs.writeFile(APP_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Send a notification to all configured channels for an event
 */
export async function sendNotification(
  event: NotificationEvent,
  title: string,
  message: string,
  details?: Record<string, string>,
): Promise<{
  success: boolean;
  results: Record<NotificationChannel, boolean>;
}> {
  const settings = await loadNotificationSettings();
  const results: Record<NotificationChannel, boolean> = {
    discord: false,
    telegram: false,
    email: false,
    slack: false,
  };

  const promises: Promise<void>[] = [];

  if (
    settings.channels.discord.events.includes(event) &&
    settings.channels.discord.enabled
  ) {
    promises.push(
      sendDiscordNotification(
        settings.channels.discord,
        event,
        title,
        message,
        details,
      ).then((result) => {
        results.discord = result;
      }),
    );
  }

  if (
    settings.channels.telegram.events.includes(event) &&
    settings.channels.telegram.enabled
  ) {
    promises.push(
      sendTelegramNotification(
        settings.channels.telegram,
        event,
        title,
        message,
        details,
      ).then((result) => {
        results.telegram = result;
      }),
    );
  }

  if (
    settings.channels.email.events.includes(event) &&
    settings.channels.email.enabled
  ) {
    promises.push(
      sendEmailNotification(
        settings.channels.email,
        event,
        title,
        message,
        details,
      ).then((result) => {
        results.email = result;
      }),
    );
  }

  if (
    settings.channels.slack.events.includes(event) &&
    settings.channels.slack.enabled
  ) {
    promises.push(
      sendSlackNotification(
        settings.channels.slack,
        event,
        title,
        message,
        details,
      ).then((result) => {
        results.slack = result;
      }),
    );
  }

  await Promise.all(promises);

  const success = Object.values(results).some((r) => r);
  return { success, results };
}

/** Exit code when process is killed by SIGTERM */
const EXIT_SIGTERM = 128 + 15;
/** Exit code when process is killed by SIGINT */
const EXIT_SIGINT = 128 + 2;

/**
 * Build notification payload for a completed sync/scrub operation.
 * Returns null for commands that don't have notification events (check, fix).
 */
export function getOperationNotificationPayload(
  command: SnapRaidCommand,
  exitCode: number,
  context?: { scheduleName?: string; diffOutput?: string },
): {
  event: NotificationEvent;
  title: string;
  message: string;
  details: Record<string, string>;
} | null {
  const aborted = exitCode === EXIT_SIGTERM || exitCode === EXIT_SIGINT;
  const source = context?.scheduleName
    ? `Scheduled: ${context.scheduleName}`
    : "Manual";
  const details: Record<string, string> = {
    Source: source,
    Time: new Date().toISOString(),
  };

  // Include exit code only on failure or abort
  if (exitCode !== 0) {
    details["Exit code"] = String(exitCode);
  }

  if (command === "sync") {
    if (context?.diffOutput?.trim()) {
      details["Pre-sync diff"] = context.diffOutput.trim();
    }
    if (exitCode === 0) {
      return {
        event: "sync_complete",
        title: "Sync completed",
        message: "SnapRAID sync finished successfully.",
        details,
      };
    }
    if (aborted) {
      return {
        event: "sync_aborted",
        title: "Sync aborted",
        message: "SnapRAID sync was aborted by user.",
        details,
      };
    }
    return {
      event: "sync_error",
      title: "Sync failed",
      message: `SnapRAID sync failed with exit code ${exitCode}.`,
      details,
    };
  }

  if (command === "scrub") {
    if (exitCode === 0) {
      return {
        event: "scrub_complete",
        title: "Scrub completed",
        message: "SnapRAID scrub finished successfully.",
        details,
      };
    }
    if (aborted) {
      return {
        event: "scrub_error",
        title: "Scrub aborted",
        message: "SnapRAID scrub was aborted by user.",
        details,
      };
    }
    return {
      event: "scrub_error",
      title: "Scrub failed",
      message: `SnapRAID scrub failed with exit code ${exitCode}.`,
      details,
    };
  }

  return null;
}

/**
 * Test a specific notification channel
 */
export async function testNotificationChannel(
  channel: NotificationChannel,
): Promise<boolean> {
  const settings = await loadNotificationSettings();
  const testEvent: NotificationEvent = "sync_complete";
  const title = "Test Notification";
  const message = "This is a test notification from SnapRAID Web UI";
  const details = {
    Channel: channel,
    Time: new Date().toISOString(),
  };

  switch (channel) {
    case "discord":
      return sendDiscordNotification(
        settings.channels.discord,
        testEvent,
        title,
        message,
        details,
      );
    case "telegram":
      return sendTelegramNotification(
        settings.channels.telegram,
        testEvent,
        title,
        message,
        details,
      );
    case "email":
      return sendEmailNotification(
        settings.channels.email,
        testEvent,
        title,
        message,
        details,
      );
    case "slack":
      return sendSlackNotification(
        settings.channels.slack,
        testEvent,
        title,
        message,
        details,
      );
    default:
      return false;
  }
}

// Re-export individual senders for direct use
export { sendDiscordNotification } from "./discord.js";
export { sendTelegramNotification } from "./telegram.js";
export { sendEmailNotification } from "./email.js";
export { sendSlackNotification } from "./slack.js";
