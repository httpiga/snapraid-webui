import nodemailer from "nodemailer";
import type { EmailSettings, NotificationEvent } from "@snapraid-webui/shared";

/**
 * Send a notification via email
 */
export async function sendEmailNotification(
  settings: EmailSettings,
  event: NotificationEvent,
  title: string,
  message: string,
  details?: Record<string, string>
): Promise<boolean> {
  if (
    !settings.enabled ||
    !settings.smtpHost ||
    settings.toAddresses.length === 0
  ) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: settings.smtpUser
      ? {
          user: settings.smtpUser,
          pass: settings.smtpPass,
        }
      : undefined,
  });

  // Subject prefix based on event type
  const prefixes: Record<NotificationEvent, string> = {
    sync_complete: "[OK]",
    sync_error: "[ERROR]",
    sync_aborted: "[WARNING]",
    sync_safety_halt: "[WARNING]",
    scrub_complete: "[OK]",
    scrub_error: "[ERROR]",
    smart_warning: "[WARNING]",
    smart_failure: "[CRITICAL]",
  };

  const prefix = prefixes[event] || "[INFO]";
  const subject = `${prefix} SnapRAID: ${title}`;

  // Build HTML body
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
        ${title}
      </h2>
      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        ${message.replace(/\n/g, "<br>")}
      </p>
  `;

  if (details) {
    html += `
      <h3 style="color: #333; margin-top: 20px;">Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
    `;

    for (const [key, value] of Object.entries(details)) {
      html += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">${key}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${value}</td>
        </tr>
      `;
    }

    html += "</table>";
  }

  html += `
      <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px;">
        This notification was sent by SnapRAID Web UI at ${new Date().toISOString()}
      </p>
    </div>
  `;

  // Plain text version
  let text = `${title}\n\n${message}`;
  if (details) {
    text += "\n\nDetails:";
    for (const [key, value] of Object.entries(details)) {
      text += `\n- ${key}: ${value}`;
    }
  }

  try {
    await transporter.sendMail({
      from: settings.fromAddress,
      to: settings.toAddresses.join(", "),
      subject,
      text,
      html,
    });

    return true;
  } catch (error) {
    console.error("Email notification error:", error);
    return false;
  }
}
