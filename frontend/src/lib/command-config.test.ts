import { describe, test, expect } from "bun:test";
import {
  optionsToArgs,
  argsToOptions,
  getCommandConfig,
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
