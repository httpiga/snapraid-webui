import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { SlackSettings } from "@snapraid-webui/shared";
import { sendSlackNotification } from "./slack";

const fetchCalls: Array<{ url: string; options: RequestInit }> = [];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchCalls.length = 0;
  globalThis.fetch = (async (url: string, options: RequestInit) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ ok: true }),
    } as Response;
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("sendSlackNotification", () => {
  const baseSettings: SlackSettings = {
    enabled: true,
    webhookUrl: "https://hooks.slack.test/services/abc",
    events: ["sync_complete"],
  };

  test("returns false when disabled or missing webhook", async () => {
    const disabled = await sendSlackNotification(
      { ...baseSettings, enabled: false },
      "sync_complete",
      "Title",
      "Message"
    );
    const missingWebhook = await sendSlackNotification(
      { ...baseSettings, webhookUrl: "" },
      "sync_complete",
      "Title",
      "Message"
    );

    expect(disabled).toBe(false);
    expect(missingWebhook).toBe(false);
    expect(fetchCalls.length).toBe(0);
  });

  test("sends Slack payload with fallback text and details fields", async () => {
    const result = await sendSlackNotification(
      baseSettings,
      "sync_complete",
      "Sync completed",
      "All files were synced",
      { Host: "nas-01" }
    );

    expect(result).toBe(true);
    expect(fetchCalls.length).toBe(1);
    const payload = JSON.parse(fetchCalls[0].options.body as string);
    expect(payload.text).toContain("Sync completed");
    expect(payload.text).toContain("All files were synced");
    expect(payload.attachments[0].color).toBe("#36a64f");
    expect(payload.attachments[0].blocks[0].type).toBe("header");
    expect(payload.attachments[0].blocks[2].fields[0].text).toContain(
      "*Host:*"
    );
  });

  test("omits details block when no details provided", async () => {
    const result = await sendSlackNotification(
      baseSettings,
      "sync_complete",
      "Sync completed",
      "All files were synced",
      {}
    );

    expect(result).toBe(true);
    expect(fetchCalls.length).toBe(1);
    const payload = JSON.parse(fetchCalls[0].options.body as string);
    expect(payload.attachments[0].blocks).toHaveLength(2);
  });
});
