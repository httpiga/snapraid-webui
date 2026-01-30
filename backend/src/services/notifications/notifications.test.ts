import { describe, test, expect } from "bun:test";
import fs from "fs/promises";
import { mkdtempSync, existsSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import * as realConfig from "../../config";
import {
  getOperationNotificationPayload,
  loadNotificationSettings,
  saveNotificationSettings,
  sendNotification,
  testNotificationChannel,
} from "./index";

describe("getOperationNotificationPayload", () => {
  test("returns null for check command", () => {
    expect(getOperationNotificationPayload("check", 0)).toBeNull();
    expect(getOperationNotificationPayload("check", 1)).toBeNull();
  });

  test("returns null for fix command", () => {
    expect(getOperationNotificationPayload("fix", 0)).toBeNull();
  });

  test("sync exit 0 returns sync_complete", () => {
    const payload = getOperationNotificationPayload("sync", 0);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("sync_complete");
    expect(payload!.title).toBe("Sync completed");
    expect(payload!.message).toContain("successfully");
    expect(payload!.details.Command).toBe("sync");
    expect(payload!.details["Exit code"]).toBe("0");
    expect(payload!.details.Source).toBe("Manual");
  });

  test("sync exit 0 with schedule name includes schedule in details", () => {
    const payload = getOperationNotificationPayload("sync", 0, {
      scheduleName: "Nightly Sync",
    });
    expect(payload).not.toBeNull();
    expect(payload!.details.Source).toBe("Scheduled: Nightly Sync");
  });

  test("sync non-zero exit returns sync_error", () => {
    const payload = getOperationNotificationPayload("sync", 1);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("sync_error");
    expect(payload!.title).toBe("Sync failed");
    expect(payload!.message).toContain("exit code 1");
  });

  test("sync aborted by SIGTERM returns sync_aborted", () => {
    const sigterm = 128 + 15;
    const payload = getOperationNotificationPayload("sync", sigterm);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("sync_aborted");
    expect(payload!.title).toBe("Sync aborted");
  });

  test("sync aborted by SIGINT returns sync_aborted", () => {
    const sigint = 128 + 2;
    const payload = getOperationNotificationPayload("sync", sigint);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("sync_aborted");
  });

  test("scrub exit 0 returns scrub_complete", () => {
    const payload = getOperationNotificationPayload("scrub", 0);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("scrub_complete");
    expect(payload!.title).toBe("Scrub completed");
  });

  test("scrub non-zero returns scrub_error", () => {
    const payload = getOperationNotificationPayload("scrub", 2);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("scrub_error");
    expect(payload!.title).toBe("Scrub failed");
  });

  test("scrub SIGTERM returns scrub_error with aborted message", () => {
    const payload = getOperationNotificationPayload("scrub", 128 + 15);
    expect(payload).not.toBeNull();
    expect(payload!.event).toBe("scrub_error");
    expect(payload!.title).toBe("Scrub aborted");
  });
});

describe("loadNotificationSettings", () => {
  test("returns default settings when config file does not exist", async () => {
    const { mock } = await import("bun:test");
    const fakePath = path.join(
      mkdtempSync(path.join(tmpdir(), "notif-")),
      "app-configon"
    );
    mock.module("../../config", () => ({
      CONFIG_PATH: realConfig.CONFIG_PATH,
      PORT: realConfig.PORT,
      APP_CONFIG_FILE: fakePath,
      SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
      SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
      LOGS_DIR: realConfig.LOGS_DIR,
      SNAPRAID_BIN: realConfig.SNAPRAID_BIN,
    }));
    const { loadNotificationSettings: load } = await import("./index");
    const settings = await load();
    expect(settings.channels.discord.enabled).toBe(false);
    expect(settings.channels.telegram.enabled).toBe(false);
    expect(settings.events.sync_complete).toContain("discord");
  });
});

describe("saveNotificationSettings and loadNotificationSettings", () => {
  test("save then load round-trips settings", async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "notif-"));
    const configPath = path.join(tmp, "app-configon");
    const { mock } = await import("bun:test");
    mock.module("../../config", () => ({
      CONFIG_PATH: realConfig.CONFIG_PATH,
      PORT: realConfig.PORT,
      APP_CONFIG_FILE: configPath,
      SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
      SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
      LOGS_DIR: realConfig.LOGS_DIR,
      SNAPRAID_BIN: realConfig.SNAPRAID_BIN,
    }));

    const { loadNotificationSettings, saveNotificationSettings } = await import(
      "./index"
    );
    const settings = await loadNotificationSettings();
    expect(settings.channels.discord.enabled).toBe(false);
    settings.channels.discord.enabled = true;
    settings.channels.discord.webhookUrl = "https://discord.com/webhook";
    await saveNotificationSettings(settings);
    expect(existsSync(configPath)).toBe(true);
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.notifications.channels.discord.enabled).toBe(true);
    expect(parsed.notifications.channels.discord.webhookUrl).toBe(
      "https://discord.com/webhook"
    );
  });
});

describe("sendNotification", () => {
  test("returns success false and all results false when no channels enabled", async () => {
    const result = await sendNotification("sync_complete", "Title", "Message");
    expect(result.success).toBe(false);
    expect(result.results.discord).toBe(false);
    expect(result.results.telegram).toBe(false);
    expect(result.results.email).toBe(false);
    expect(result.results.slack).toBe(false);
  });
});

describe("testNotificationChannel", () => {
  test("returns false when channel not configured (e.g. discord)", async () => {
    const result = await testNotificationChannel("discord");
    expect(result).toBe(false);
  });

  test("returns false for telegram when not configured", async () => {
    const result = await testNotificationChannel("telegram");
    expect(result).toBe(false);
  });
});
