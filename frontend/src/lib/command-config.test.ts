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
  test("sync command config has no options (handled by SyncSafetySettings)", () => {
    const config = getCommandConfig("sync");
    expect(config).toBeDefined();
    expect(config!.options).toEqual([]);
  });
});

describe("syncSafetyToArgs and argsToSyncSafety", () => {
  test("syncSafetyToArgs with mode disabled returns only flags when enabled", () => {
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
  });

  test("syncSafetyToArgs with mode default uses default settings", () => {
    const args = syncSafetyToArgs(
      "default",
      {
        preHash: false, // Will be overridden by default settings
        forceEmpty: true, // Will be overridden by default settings
      },
      {
        preHash: true,
        forceEmpty: false,
      }
    );
    expect(args).toContain("--pre-hash");
    expect(args).not.toContain("--force-empty");
  });

  test("syncSafetyToArgs with mode custom uses custom values", () => {
    const args = syncSafetyToArgs(
      "custom",
      {
        preHash: false,
        forceEmpty: true,
      },
      null
    );
    expect(args).not.toContain("--pre-hash");
    expect(args).toContain("--force-empty");
  });

  test("argsToSyncSafety with no flags returns disabled mode", () => {
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

  test("argsToSyncSafety with force-empty returns default mode", () => {
    const result = argsToSyncSafety(["--force-empty"]);
    expect(result.mode).toBe("default");
    expect(result.preHash).toBe(false);
    expect(result.forceEmpty).toBe(true);
  });

  test("round-trip: syncSafetyToArgs then argsToSyncSafety", () => {
    const original = {
      mode: "custom" as const,
      preHash: true,
      forceEmpty: false,
    };
    const args = syncSafetyToArgs(original.mode, original, null);
    const parsed = argsToSyncSafety(args);
    // Mode detection is simpler now: disabled if no flags, default otherwise
    expect(parsed.mode).toBe("default");
    expect(parsed.preHash).toBe(true);
    expect(parsed.forceEmpty).toBe(false);
  });
});
