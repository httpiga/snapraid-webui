import { describe, test, expect } from "bun:test";
import { getNextRunTime } from "./scheduler.js";

describe("getNextRunTime", () => {
  test("returns ISO string for valid cron expression", () => {
    const next = getNextRunTime("0 0 * * *");
    expect(next).toBeDefined();
    expect(typeof next).toBe("string");
    expect(() => new Date(next!).toISOString()).not.toThrow();
  });

  test("returns undefined for invalid cron expression", () => {
    expect(getNextRunTime("not-a-cron")).toBeUndefined();
    expect(getNextRunTime("99 99 * * *")).toBeUndefined();
  });

  test("every minute returns a time within next minute", () => {
    const next = getNextRunTime("* * * * *");
    expect(next).toBeDefined();
    const nextDate = new Date(next!);
    const now = new Date();
    const diffMs = nextDate.getTime() - now.getTime();
    expect(diffMs).toBeGreaterThan(0);
    expect(diffMs).toBeLessThanOrEqual(60_000);
  });
});
