import type {
  NotificationChannel,
  NotificationSettings,
  DiscordSettings,
  TelegramSettings,
  EmailSettings,
  SlackSettings,
} from "@shared/types";
import { NOTIFICATION_EVENTS } from "@shared/types";

const EMPTY_DISCORD: DiscordSettings = {
  enabled: false,
  webhookUrl: "",
  events: [...NOTIFICATION_EVENTS],
};
const EMPTY_TELEGRAM: TelegramSettings = {
  enabled: false,
  botToken: "",
  chatId: "",
  events: [...NOTIFICATION_EVENTS],
};
const EMPTY_EMAIL: EmailSettings = {
  enabled: false,
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPass: "",
  fromAddress: "",
  toAddresses: [],
  events: [...NOTIFICATION_EVENTS],
};
const EMPTY_SLACK: SlackSettings = {
  enabled: false,
  webhookUrl: "",
  events: [...NOTIFICATION_EVENTS],
};

export type ChannelConfig =
  | DiscordSettings
  | TelegramSettings
  | EmailSettings
  | SlackSettings;

export function getEmptyChannelConfig(
  channel: NotificationChannel,
): ChannelConfig {
  switch (channel) {
    case "discord":
      return { ...EMPTY_DISCORD };
    case "telegram":
      return { ...EMPTY_TELEGRAM };
    case "email":
      return { ...EMPTY_EMAIL };
    case "slack":
      return { ...EMPTY_SLACK };
  }
}

export function getChannelConfigSummary(
  channel: NotificationChannel,
  settings: NotificationSettings,
): string {
  switch (channel) {
    case "discord":
      return settings.channels.discord.webhookUrl?.trim()
        ? "Webhook configured"
        : "No webhook set";
    case "telegram":
      return settings.channels.telegram.botToken?.trim() &&
        settings.channels.telegram.chatId?.trim()
        ? "Bot and chat configured"
        : "No configuration set";
    case "email":
      return settings.channels.email.smtpHost?.trim()
        ? "SMTP configured"
        : "No configuration set";
    case "slack":
      return settings.channels.slack.webhookUrl?.trim()
        ? "Webhook configured"
        : "No webhook set";
  }
}
