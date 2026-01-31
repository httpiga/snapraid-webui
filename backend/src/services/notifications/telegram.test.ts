import { describe, test, expect, mock, beforeAll, afterAll } from "bun:test";
import { sendTelegramNotification } from "./telegram";
import { silenceConsole } from "../../test-utils/silence-console";

const originalFetch = globalThis.fetch;

beforeAll(() => {
  (globalThis as any).fetch = mock((url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    if (
      url.startsWith("https://api.telegram.org/bot") &&
      body.chat_id &&
      body.text
    ) {
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ ok: false }), { status: 400 })
    );
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe("sendTelegramNotification", () => {
  test("returns false when not enabled", async () => {
    const result = await sendTelegramNotification(
      { enabled: false, botToken: "token", chatId: "123" },
      "sync_complete",
      "Title",
      "Message"
    );
    expect(result).toBe(false);
  });

  test("returns false when botToken is empty", async () => {
    const result = await sendTelegramNotification(
      { enabled: true, botToken: "", chatId: "123" },
      "sync_complete",
      "Title",
      "Message"
    );
    expect(result).toBe(false);
  });

  test("returns false when chatId is empty", async () => {
    const result = await sendTelegramNotification(
      { enabled: true, botToken: "token", chatId: "" },
      "sync_complete",
      "Title",
      "Message"
    );
    expect(result).toBe(false);
  });

  test("sends message and returns true when API succeeds", async () => {
    const result = await sendTelegramNotification(
      { enabled: true, botToken: "test-token", chatId: "123" },
      "sync_complete",
      "Sync completed",
      "Message body",
      { Key: "value" }
    );
    expect(result).toBe(true);
    expect((globalThis as any).fetch).toHaveBeenCalled();
    const call = (globalThis as any).fetch.mock.calls[0];
    expect(call[0]).toContain("api.telegram.org/bottest-token/sendMessage");
    const body = JSON.parse(call[1].body);
    expect(body.chat_id).toBe("123");
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toContain("Sync completed");
    expect(body.text).toContain("Message body");
    expect(body.text).toContain("Key");
    expect(body.text).toContain("value");
  });

  test("returns false when API returns non-ok", async () => {
    (globalThis as any).fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ ok: false, description: "Bad request" }),
          { status: 400 }
        )
      )
    );
    const restore = silenceConsole();
    const result = await sendTelegramNotification(
      { enabled: true, botToken: "token", chatId: "123" },
      "sync_error",
      "Title",
      "Message"
    );
    restore();
    expect(result).toBe(false);
  });
});
