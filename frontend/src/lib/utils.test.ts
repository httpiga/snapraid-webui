import { describe, test, expect } from "bun:test";
import { cn, getCommandBadgeVariant } from "./utils";

describe("cn", () => {
  test("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  test("handles conditional classes", () => {
    expect(cn("base", false, "visible")).toContain("base");
    expect(cn("base", false, "visible")).toContain("visible");
  });

  test("handles single argument", () => {
    expect(cn("single")).toBe("single");
  });
});

describe("getCommandBadgeVariant", () => {
  test("sync returns default", () => {
    expect(getCommandBadgeVariant("sync")).toBe("default");
  });

  test("scrub returns secondary", () => {
    expect(getCommandBadgeVariant("scrub")).toBe("secondary");
  });

  test("fix returns destructive", () => {
    expect(getCommandBadgeVariant("fix")).toBe("destructive");
  });

  test("check returns outline", () => {
    expect(getCommandBadgeVariant("check")).toBe("outline");
  });

  test("unknown command returns secondary", () => {
    expect(getCommandBadgeVariant("status")).toBe("secondary");
    expect(getCommandBadgeVariant("diff")).toBe("secondary");
    expect(getCommandBadgeVariant("unknown")).toBe("secondary");
  });
});
