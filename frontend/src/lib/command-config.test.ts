import { describe, test, expect } from "bun:test";
import {
  optionsToArgs,
  argsToOptions,
  getCommandConfig,
  syncSafetyToArgs,
  argsToSyncSafety,
  type CommandConfig,
  type CommandOption,
} from "./command-config";

/** Minimal command config for testing option conversion (no JSX) */
function mockCommandConfig(options: CommandOption[]): CommandConfig {
  return {
    name: "Test",
    command: "sync",
    description: "Test command",
    icon: undefined as unknown as CommandConfig["icon"],
    longRunning: true,
    options,
  };
}

describe("optionsToArgs", () => {
  test("returns empty array when no options", () => {
    const config = mockCommandConfig([]);
    expect(optionsToArgs(config, {})).toEqual([]);
  });

  test("omits false and undefined boolean options", () => {
    const config = mockCommandConfig([
      {
        name: "Pre-hash",
        key: "pre-hash",
        type: "boolean",
        description: "Pre-hash",
      },
    ]);
    expect(optionsToArgs(config, { "pre-hash": false })).toEqual([]);
    expect(optionsToArgs(config, {})).toEqual([]);
  });

  test("adds boolean flag when true", () => {
    const config = mockCommandConfig([
      {
        name: "Pre-hash",
        key: "pre-hash",
        type: "boolean",
        description: "Pre-hash",
      },
    ]);
    expect(optionsToArgs(config, { "pre-hash": true })).toEqual(["--pre-hash"]);
  });

  test("adds short flag and value for number option", () => {
    const config = mockCommandConfig([
      {
        name: "Plan",
        key: "plan",
        type: "number",
        description: "Plan %",
        default: 8,
      },
    ]);
    expect(optionsToArgs(config, { plan: 10 })).toEqual(["-p", "10"]);
  });

  test("skips empty string", () => {
    const config = mockCommandConfig([
      { name: "Filter", key: "filter", type: "string", description: "Filter" },
    ]);
    expect(optionsToArgs(config, { filter: "" })).toEqual([]);
  });

  test("multiple options", () => {
    const config = mockCommandConfig([
      {
        name: "Pre-hash",
        key: "pre-hash",
        type: "boolean",
        description: "Pre-hash",
      },
      {
        name: "Force Empty",
        key: "force-empty",
        type: "boolean",
        description: "Force empty",
      },
    ]);
    expect(
      optionsToArgs(config, { "pre-hash": true, "force-empty": true })
    ).toEqual(["--pre-hash", "--force-empty"]);
  });
});

describe("argsToOptions", () => {
  test("returns empty object when no options", () => {
    const config = mockCommandConfig([]);
    expect(argsToOptions(config, [])).toEqual({});
  });

  test("boolean: true when flag present", () => {
    const config = mockCommandConfig([
      {
        name: "Pre-hash",
        key: "pre-hash",
        type: "boolean",
        description: "Pre-hash",
      },
    ]);
    expect(argsToOptions(config, ["--pre-hash"])).toEqual({ "pre-hash": true });
  });

  test("boolean: false when flag absent", () => {
    const config = mockCommandConfig([
      {
        name: "Pre-hash",
        key: "pre-hash",
        type: "boolean",
        description: "Pre-hash",
      },
    ]);
    expect(argsToOptions(config, [])).toEqual({ "pre-hash": false });
  });

  test("number: parses value after short flag", () => {
    const config = mockCommandConfig([
      {
        name: "Plan",
        key: "plan",
        type: "number",
        description: "Plan %",
        default: 8,
      },
    ]);
    expect(argsToOptions(config, ["-p", "15"])).toEqual({ plan: 15 });
  });

  test("number: uses default when flag absent", () => {
    const config = mockCommandConfig([
      {
        name: "Plan",
        key: "plan",
        type: "number",
        description: "Plan %",
        default: 8,
      },
    ]);
    expect(argsToOptions(config, [])).toEqual({ plan: 8 });
  });

  test("string: uses value after short flag", () => {
    const config = mockCommandConfig([
      { name: "Filter", key: "filter", type: "string", description: "Filter" },
    ]);
    expect(argsToOptions(config, ["-f", "/path/to/file"])).toEqual({
      filter: "/path/to/file",
    });
  });

  test("round-trip: optionsToArgs then argsToOptions", () => {
    const config = mockCommandConfig([
      {
        name: "Pre-hash",
        key: "pre-hash",
        type: "boolean",
        description: "Pre-hash",
      },
      {
        name: "Plan",
        key: "plan",
        type: "number",
        description: "Plan %",
        default: 8,
      },
    ]);
    const options = { "pre-hash": true, plan: 20 };
    const args = optionsToArgs(config, options);
    const back = argsToOptions(config, args);
    expect(back["pre-hash"]).toBe(true);
    expect(back.plan).toBe(20);
  });
});

describe("getCommandConfig", () => {
  test("returns config for sync", () => {
    const config = getCommandConfig("sync");
    expect(config).toBeDefined();
    expect(config!.command).toBe("sync");
    expect(config!.name).toBe("Sync");
    expect(config!.options).toBeDefined();
  });

  test("returns config for scrub", () => {
    const config = getCommandConfig("scrub");
    expect(config).toBeDefined();
    expect(config!.command).toBe("scrub");
  });

  test("returns undefined for unknown command", () => {
    expect(getCommandConfig("unknown" as never)).toBeUndefined();
  });
});

describe("Sync safety options", () => {
  test("optionsToArgs converts max-deleted-files to -d flag", () => {
    const config = mockCommandConfig([
      {
        name: "Max Deleted Files",
        key: "max-deleted-files",
        type: "number",
        description: "Test",
        default: 0,
      },
    ]);
    expect(optionsToArgs(config, { "max-deleted-files": 100 })).toEqual([
      "-d",
      "100",
    ]);
  });

  test("optionsToArgs converts max-deleted-percent to -p flag", () => {
    const config = mockCommandConfig([
      {
        name: "Max Deleted Percent",
        key: "max-deleted-percent",
        type: "number",
        description: "Test",
        default: 0,
      },
    ]);
    expect(optionsToArgs(config, { "max-deleted-percent": 10 })).toEqual([
      "-p",
      "10",
    ]);
  });

  test("optionsToArgs handles sync with all safety options", () => {
    const config = mockCommandConfig([
      {
        name: "Pre-hash",
        key: "pre-hash",
        type: "boolean",
        description: "Test",
      },
      {
        name: "Max Deleted Files",
        key: "max-deleted-files",
        type: "number",
        description: "Test",
        default: 0,
      },
      {
        name: "Max Deleted Percent",
        key: "max-deleted-percent",
        type: "number",
        description: "Test",
        default: 0,
      },
      {
        name: "Force Empty",
        key: "force-empty",
        type: "boolean",
        description: "Test",
      },
    ]);
    const args = optionsToArgs(config, {
      "pre-hash": true,
      "max-deleted-files": 50,
      "max-deleted-percent": 5,
      "force-empty": false,
    });
    expect(args).toContain("--pre-hash");
    expect(args).toContain("-d");
    expect(args).toContain("50");
    expect(args).toContain("-p");
    expect(args).toContain("5");
    expect(args).not.toContain("--force-empty");
  });

  test("argsToOptions parses sync safety args correctly", () => {
    const config = mockCommandConfig([
      {
        name: "Pre-hash",
        key: "pre-hash",
        type: "boolean",
        description: "Test",
      },
      {
        name: "Max Deleted Files",
        key: "max-deleted-files",
        type: "number",
        description: "Test",
        default: 0,
      },
      {
        name: "Max Deleted Percent",
        key: "max-deleted-percent",
        type: "number",
        description: "Test",
        default: 0,
      },
    ]);
    const options = argsToOptions(config, [
      "--pre-hash",
      "-d",
      "100",
      "-p",
      "10",
    ]);
    expect(options["pre-hash"]).toBe(true);
    expect(options["max-deleted-files"]).toBe(100);
    expect(options["max-deleted-percent"]).toBe(10);
  });

  test("argsToOptions uses defaults when args not provided", () => {
    const config = mockCommandConfig([
      {
        name: "Max Deleted Files",
        key: "max-deleted-files",
        type: "number",
        description: "Test",
        default: 100,
      },
      {
        name: "Max Deleted Percent",
        key: "max-deleted-percent",
        type: "number",
        description: "Test",
        default: 10,
      },
    ]);
    const options = argsToOptions(config, []);
    expect(options["max-deleted-files"]).toBe(100);
    expect(options["max-deleted-percent"]).toBe(10);
  });

  test("sync command config has no options (handled by SyncSafetySettings)", () => {
    const config = getCommandConfig("sync");
    expect(config).toBeDefined();
    expect(config!.options).toEqual([]);
  });
});

describe("syncSafetyToArgs and argsToSyncSafety", () => {
  test("syncSafetyToArgs with mode disabled returns only pre-hash and force-empty", () => {
    const args = syncSafetyToArgs(
      "disabled",
      {
        preHash: true,
        forceEmpty: true,
      },
      null
    );
    expect(args).toContain("--pre-hash");
    expect(args).toContain("--force-empty");
    expect(args).not.toContain("-d");
    expect(args).not.toContain("-p");
  });

  test("syncSafetyToArgs with mode default uses default settings", () => {
    const args = syncSafetyToArgs(
      "default",
      {
        preHash: false, // Will be overridden by default settings
        forceEmpty: true, // Will be overridden by default settings
      },
      {
        maxDeletedFiles: 150,
        maxDeletedPercent: 15,
        preHash: true,
        forceEmpty: false,
      }
    );
    expect(args).toContain("--pre-hash");
    expect(args).toContain("-d");
    expect(args).toContain("150");
    expect(args).toContain("-p");
    expect(args).toContain("15");
    expect(args).not.toContain("--force-empty");
  });

  test("syncSafetyToArgs with mode custom uses custom values", () => {
    const args = syncSafetyToArgs(
      "custom",
      {
        preHash: false,
        forceEmpty: true,
        maxDeletedFiles: 200,
        maxDeletedPercent: 20,
      },
      null
    );
    expect(args).not.toContain("--pre-hash");
    expect(args).toContain("--force-empty");
    expect(args).toContain("-d");
    expect(args).toContain("200");
    expect(args).toContain("-p");
    expect(args).toContain("20");
  });

  test("argsToSyncSafety parses args with custom thresholds", () => {
    const result = argsToSyncSafety([
      "--pre-hash",
      "-d",
      "100",
      "-p",
      "10",
      "--force-empty",
    ]);
    expect(result.mode).toBe("custom");
    expect(result.preHash).toBe(true);
    expect(result.forceEmpty).toBe(true);
    expect(result.maxDeletedFiles).toBe(100);
    expect(result.maxDeletedPercent).toBe(10);
  });

  test("argsToSyncSafety with no thresholds returns disabled mode", () => {
    const result = argsToSyncSafety([]);
    expect(result.mode).toBe("disabled");
    expect(result.preHash).toBe(false);
    expect(result.forceEmpty).toBe(false);
  });

  test("argsToSyncSafety with only pre-hash returns default mode", () => {
    const result = argsToSyncSafety(["--pre-hash"]);
    expect(result.mode).toBe("default");
    expect(result.preHash).toBe(true);
    expect(result.forceEmpty).toBe(false);
  });

  test("round-trip: syncSafetyToArgs then argsToSyncSafety", () => {
    const original = {
      mode: "custom" as const,
      preHash: true,
      forceEmpty: false,
      maxDeletedFiles: 75,
      maxDeletedPercent: 8,
    };
    const args = syncSafetyToArgs(original.mode, original, null);
    const parsed = argsToSyncSafety(args);
    expect(parsed.mode).toBe("custom");
    expect(parsed.preHash).toBe(true);
    expect(parsed.forceEmpty).toBe(false);
    expect(parsed.maxDeletedFiles).toBe(75);
    expect(parsed.maxDeletedPercent).toBe(8);
  });
});
