import fs from "fs/promises";
import { existsSync } from "fs";
import type {
  NotificationSettings,
  NotificationEvent,
  NotificationChannel,
} from "@snapraid-webui/shared";
import { APP_CONFIG_FILE } from "../../config.js";
import { sendDiscordNotification } from "./discord.js";
import { sendTelegramNotification } from "./telegram.js";
import { sendEmailNotification } from "./email.js";
import { sendSlackNotification } from "./slack.js";

// Default notification settings
const defaultSettings: NotificationSettings = {
  channels: {
    discord: { enabled: false, webhookUrl: "" },
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
    slack: { enabled: false, webhookUrl: "" },
  },
  events: {
    sync_complete: ["discord", "telegram", "email", "slack"],
    sync_error: ["discord", "telegram", "email", "slack"],
    sync_aborted: ["discord", "telegram", "email", "slack"],
    scrub_complete: ["discord", "telegram", "email", "slack"],
    scrub_error: ["discord", "telegram", "email", "slack"],
    smart_warning: ["discord", "telegram", "email", "slack"],
    smart_failure: ["discord", "telegram", "email", "slack"],
  },
};

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
    return config.notifications || defaultSettings;
  } catch {
    return defaultSettings;
  }
}

/**
 * Save notification settings to app config
 */
export async function saveNotificationSettings(
  settings: NotificationSettings
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
  details?: Record<string, string>
): Promise<{
  success: boolean;
  results: Record<NotificationChannel, boolean>;
}> {
  const settings = await loadNotificationSettings();
  const channels = settings.events[event] || [];

  const results: Record<NotificationChannel, boolean> = {
    discord: false,
    telegram: false,
    email: false,
    slack: false,
  };

  const promises: Promise<void>[] = [];

  if (channels.includes("discord") && settings.channels.discord.enabled) {
    promises.push(
      sendDiscordNotification(
        settings.channels.discord,
        event,
        title,
        message,
        details
      ).then((result) => {
        results.discord = result;
      })
    );
  }

  if (channels.includes("telegram") && settings.channels.telegram.enabled) {
    promises.push(
      sendTelegramNotification(
        settings.channels.telegram,
        event,
        title,
        message,
        details
      ).then((result) => {
        results.telegram = result;
      })
    );
  }

  if (channels.includes("email") && settings.channels.email.enabled) {
    promises.push(
      sendEmailNotification(
        settings.channels.email,
        event,
        title,
        message,
        details
      ).then((result) => {
        results.email = result;
      })
    );
  }

  if (channels.includes("slack") && settings.channels.slack.enabled) {
    promises.push(
      sendSlackNotification(
        settings.channels.slack,
        event,
        title,
        message,
        details
      ).then((result) => {
        results.slack = result;
      })
    );
  }

  await Promise.all(promises);

  const success = Object.values(results).some((r) => r);
  return { success, results };
}

/**
 * Test a specific notification channel
 */
export async function testNotificationChannel(
  channel: NotificationChannel
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
        details
      );
    case "telegram":
      return sendTelegramNotification(
        settings.channels.telegram,
        testEvent,
        title,
        message,
        details
      );
    case "email":
      return sendEmailNotification(
        settings.channels.email,
        testEvent,
        title,
        message,
        details
      );
    case "slack":
      return sendSlackNotification(
        settings.channels.slack,
        testEvent,
        title,
        message,
        details
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
