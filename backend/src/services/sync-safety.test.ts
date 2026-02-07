import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import fs from "fs/promises"
import { existsSync } from "fs"
import * as realConfig from "../config"

const { mock } = await import("bun:test")

// Mock the config to use a temp test file
const TEST_APP_CONFIG = "/tmp/test-app-config.json"

mock.module("../config", () => ({
  CONFIG_PATH: realConfig.CONFIG_PATH,
  PORT: realConfig.PORT,
  APP_CONFIG_FILE: TEST_APP_CONFIG,
  SCHEDULES_FILE: realConfig.SCHEDULES_FILE,
  SNAPRAID_CONF_FILE: realConfig.SNAPRAID_CONF_FILE,
  LOGS_DIR: realConfig.LOGS_DIR,
  SNAPRAID_BIN: realConfig.SNAPRAID_BIN,
}))

const { loadSyncSafetySettings, saveSyncSafetySettings } =
  await import("./sync-safety")

beforeEach(async () => {
  // Clean up test file before each test
  if (existsSync(TEST_APP_CONFIG)) {
    await fs.unlink(TEST_APP_CONFIG)
  }
})

afterEach(async () => {
  // Clean up test file after each test
  if (existsSync(TEST_APP_CONFIG)) {
    await fs.unlink(TEST_APP_CONFIG)
  }
})

describe("loadSyncSafetySettings", () => {
  test("returns default settings when config file doesn't exist", async () => {
    const settings = await loadSyncSafetySettings()
    expect(settings).toEqual({
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    })
  })

  test("loads settings from existing config file", async () => {
    const config = {
      syncSafety: {
        enabled: false,
        maxDeletedFiles: 50,
        maxUpdatedFiles: 200,
        maxAddedFiles: 5000,
        preHash: true,
        forceEmpty: true,
      },
    }
    await fs.writeFile(TEST_APP_CONFIG, JSON.stringify(config), "utf-8")

    const settings = await loadSyncSafetySettings()
    expect(settings).toEqual(config.syncSafety)
  })

  test("returns defaults when syncSafety key is missing", async () => {
    const config = { notifications: {} }
    await fs.writeFile(TEST_APP_CONFIG, JSON.stringify(config), "utf-8")

    const settings = await loadSyncSafetySettings()
    expect(settings).toEqual({
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    })
  })

  test("returns defaults on malformed JSON", async () => {
    await fs.writeFile(TEST_APP_CONFIG, "invalid json", "utf-8")

    const settings = await loadSyncSafetySettings()
    expect(settings).toEqual({
      enabled: true,
      maxDeletedFiles: 100,
      maxUpdatedFiles: 500,
      maxAddedFiles: 10000,
      preHash: false,
      forceEmpty: false,
    })
  })
})

describe("saveSyncSafetySettings", () => {
  test("creates config file with sync safety settings", async () => {
    const settings = {
      enabled: false,
      maxDeletedFiles: 200,
      maxUpdatedFiles: 600,
      maxAddedFiles: 12000,
      preHash: true,
      forceEmpty: true,
    }

    await saveSyncSafetySettings(settings)

    const content = await fs.readFile(TEST_APP_CONFIG, "utf-8")
    const config = JSON.parse(content)
    expect(config.syncSafety).toEqual(settings)
  })

  test("preserves other config when saving sync safety settings", async () => {
    const initialConfig = {
      notifications: { some: "data" },
      schedules: [],
    }
    await fs.writeFile(TEST_APP_CONFIG, JSON.stringify(initialConfig), "utf-8")

    const settings = {
      enabled: true,
      maxDeletedFiles: 150,
      maxUpdatedFiles: 450,
      maxAddedFiles: 9000,
      preHash: false,
      forceEmpty: false,
    }

    await saveSyncSafetySettings(settings)

    const content = await fs.readFile(TEST_APP_CONFIG, "utf-8")
    const config = JSON.parse(content)
    expect(config.notifications).toEqual(initialConfig.notifications)
    expect(config.schedules).toEqual(initialConfig.schedules)
    expect(config.syncSafety).toEqual(settings)
  })

  test("overwrites existing sync safety settings", async () => {
    const oldSettings = {
      enabled: false,
      maxDeletedFiles: 50,
      maxUpdatedFiles: 250,
      maxAddedFiles: 5000,
      preHash: false,
      forceEmpty: false,
    }
    await fs.writeFile(
      TEST_APP_CONFIG,
      JSON.stringify({ syncSafety: oldSettings }),
      "utf-8",
    )

    const newSettings = {
      enabled: true,
      maxDeletedFiles: 300,
      maxUpdatedFiles: 750,
      maxAddedFiles: 15000,
      preHash: true,
      forceEmpty: true,
    }

    await saveSyncSafetySettings(newSettings)

    const content = await fs.readFile(TEST_APP_CONFIG, "utf-8")
    const config = JSON.parse(content)
    expect(config.syncSafety).toEqual(newSettings)
  })
})
