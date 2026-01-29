import { Router } from "express";
import type { NotificationChannel } from "@snapraid-webui/shared";
import {
  loadNotificationSettings,
  saveNotificationSettings,
  testNotificationChannel,
} from "../services/notifications/index.js";

const router = Router();

/**
 * GET /api/notifications/settings
 * Get notification settings
 */
router.get("/settings", async (_req, res) => {
  try {
    const settings = await loadNotificationSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error getting notification settings:", error);
    res.status(500).json({ error: "Failed to get notification settings" });
  }
});

/**
 * PUT /api/notifications/settings
 * Update notification settings
 */
router.put("/settings", async (req, res) => {
  try {
    await saveNotificationSettings(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving notification settings:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to save notification settings" });
  }
});

/**
 * POST /api/notifications/test
 * Test a notification channel
 */
router.post("/test", async (req, res) => {
  try {
    const { channel } = req.body as { channel: NotificationChannel };

    if (
      !channel ||
      !["discord", "telegram", "email", "slack"].includes(channel)
    ) {
      res.status(400).json({ success: false, error: "Invalid channel" });
      return;
    }

    const success = await testNotificationChannel(channel);

    if (success) {
      res.json({
        success: true,
        message: `Test notification sent to ${channel}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Failed to send test notification to ${channel}. Check your settings.`,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error testing notification:", error);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
