import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import fs from "fs/promises";
import { existsSync } from "fs";
import type { AdvancedSettings } from "@snapraid-webui/shared";

const TEST_APP_CONFIG = "/tmp/test-app-config-advanced.json";

// Mock the config module before importing advanced-settings
mock.module("../config.js", () => ({
  APP_CONFIG_FILE: TEST_APP_CONFIG,
  SNAPRAID_CONF_FILE: "/tmp/test.conf",
  SCHEDULES_FILE: "/tmp/test-schedules.json",
  LOGS_DIR: "/tmp/logs",
  PORT: 3000,
  CONFIG_PATH: "/tmp",
  SNAPRAID_BIN: "snapraid",
}));

// Import after setting up the mock
const {
  loadAdvancedSettings,
  saveAdvancedSettings,
  getAdvancedArgsForCommand,
} = await import("./advanced-settings.js");

describe("loadAdvancedSettings", () => {
  beforeEach(async () => {
    // Clean up before each test
    if (existsSync(TEST_APP_CONFIG)) {
      await fs.unlink(TEST_APP_CONFIG);
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (existsSync(TEST_APP_CONFIG)) {
      await fs.unlink(TEST_APP_CONFIG);
    }
  });

  test("returns defaults when config file doesn't exist", async () => {
    const settings = await loadAdvancedSettings();
    expect(settings).toEqual({
      spinDownOnError: false,
      bwLimit: "",
      forceUuid: false,
      errorLimit: 0,
    });
  });

  test("returns defaults when advanced key is missing", async () => {
    const config = { version: "1.0.0" };
    await fs.writeFile(TEST_APP_CONFIG, JSON.stringify(config), "utf-8");

    const settings = await loadAdvancedSettings();
    expect(settings).toEqual({
      spinDownOnError: false,
      bwLimit: "",
      forceUuid: false,
      errorLimit: 0,
    });
  });

  test("returns advanced settings from config", async () => {
    const config = {
      advanced: {
        spinDownOnError: true,
        bwLimit: "100M",
        forceUuid: true,
        errorLimit: 200,
      },
    };
    await fs.writeFile(TEST_APP_CONFIG, JSON.stringify(config), "utf-8");

    const settings = await loadAdvancedSettings();
    expect(settings).toEqual(config.advanced);
  });

  test("returns defaults when config file is invalid JSON", async () => {
    await fs.writeFile(TEST_APP_CONFIG, "invalid json", "utf-8");

    const settings = await loadAdvancedSettings();
    expect(settings).toEqual({
      spinDownOnError: false,
      bwLimit: "",
      forceUuid: false,
      errorLimit: 0,
    });
  });
});

describe("saveAdvancedSettings", () => {
  beforeEach(async () => {
    if (existsSync(TEST_APP_CONFIG)) {
      await fs.unlink(TEST_APP_CONFIG);
    }
  });

  afterEach(async () => {
    if (existsSync(TEST_APP_CONFIG)) {
      await fs.unlink(TEST_APP_CONFIG);
    }
  });

  test("creates config file with advanced settings", async () => {
    const settings: AdvancedSettings = {
      spinDownOnError: true,
      bwLimit: "100M",
      forceUuid: false,
      errorLimit: 150,
    };

    await saveAdvancedSettings(settings);

    const content = await fs.readFile(TEST_APP_CONFIG, "utf-8");
    const config = JSON.parse(content);
    expect(config.advanced).toEqual(settings);
  });

  test("updates existing config file with advanced settings", async () => {
    const initialConfig = {
      version: "1.0.0",
      someOtherKey: "value",
    };
    await fs.writeFile(TEST_APP_CONFIG, JSON.stringify(initialConfig), "utf-8");

    const settings: AdvancedSettings = {
      spinDownOnError: false,
      bwLimit: "1G",
      forceUuid: true,
      errorLimit: 0,
    };

    await saveAdvancedSettings(settings);

    const content = await fs.readFile(TEST_APP_CONFIG, "utf-8");
    const config = JSON.parse(content);
    expect(config.version).toBe("1.0.0");
    expect(config.someOtherKey).toBe("value");
    expect(config.advanced).toEqual(settings);
  });

  test("overwrites existing advanced settings", async () => {
    const oldSettings: AdvancedSettings = {
      spinDownOnError: true,
      bwLimit: "50M",
      forceUuid: false,
      errorLimit: 100,
    };
    await fs.writeFile(
      TEST_APP_CONFIG,
      JSON.stringify({ advanced: oldSettings }),
      "utf-8",
    );

    const newSettings: AdvancedSettings = {
      spinDownOnError: false,
      bwLimit: "200M",
      forceUuid: true,
      errorLimit: 300,
    };

    await saveAdvancedSettings(newSettings);

    const content = await fs.readFile(TEST_APP_CONFIG, "utf-8");
    const config = JSON.parse(content);
    expect(config.advanced).toEqual(newSettings);
  });
});

describe("getAdvancedArgsForCommand", () => {
  test("returns empty array for non-long-running commands", () => {
    const settings: AdvancedSettings = {
      spinDownOnError: true,
      bwLimit: "100M",
      forceUuid: true,
      errorLimit: 200,
    };

    expect(getAdvancedArgsForCommand(settings, "status")).toEqual([]);
    expect(getAdvancedArgsForCommand(settings, "diff")).toEqual([]);
  });

  test("returns all applicable flags for sync command", () => {
    const settings: AdvancedSettings = {
      spinDownOnError: true,
      bwLimit: "100M",
      forceUuid: true,
      errorLimit: 200,
    };

    const args = getAdvancedArgsForCommand(settings, "sync");
    expect(args).toEqual(["-s", "-w", "100M", "-U", "-L", "200"]);
  });

  test("returns scrub flags (no forceUuid)", () => {
    const settings: AdvancedSettings = {
      spinDownOnError: true,
      bwLimit: "1G",
      forceUuid: true, // Should be ignored for scrub
      errorLimit: 150,
    };

    const args = getAdvancedArgsForCommand(settings, "scrub");
    expect(args).toEqual(["-s", "-w", "1G", "-L", "150"]);
  });

  test("returns check flags (no errorLimit)", () => {
    const settings: AdvancedSettings = {
      spinDownOnError: true,
      bwLimit: "500M",
      forceUuid: true,
      errorLimit: 200, // Should be ignored for check
    };

    const args = getAdvancedArgsForCommand(settings, "check");
    expect(args).toEqual(["-s", "-w", "500M", "-U"]);
  });

  test("returns fix flags (no errorLimit)", () => {
    const settings: AdvancedSettings = {
      spinDownOnError: true,
      bwLimit: "200M",
      forceUuid: true,
      errorLimit: 100, // Should be ignored for fix
    };

    const args = getAdvancedArgsForCommand(settings, "fix");
    expect(args).toEqual(["-s", "-w", "200M", "-U"]);
  });

  test("handles disabled flags", () => {
    const settings: AdvancedSettings = {
      spinDownOnError: false,
      bwLimit: "",
      forceUuid: false,
      errorLimit: 0,
    };

    expect(getAdvancedArgsForCommand(settings, "sync")).toEqual([]);
    expect(getAdvancedArgsForCommand(settings, "scrub")).toEqual([]);
  });

  test("handles partial settings", () => {
    const settings: AdvancedSettings = {
      spinDownOnError: true,
      bwLimit: "",
      forceUuid: false,
      errorLimit: 0,
    };

    const args = getAdvancedArgsForCommand(settings, "sync");
    expect(args).toEqual(["-s"]);
  });

  test("trims bandwidth limit whitespace", () => {
    const settings: AdvancedSettings = {
      spinDownOnError: false,
      bwLimit: "  100M  ",
      forceUuid: false,
      errorLimit: 0,
    };

    const args = getAdvancedArgsForCommand(settings, "sync");
    expect(args).toEqual(["-w", "100M"]);
  });
});
