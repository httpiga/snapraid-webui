import { defineConfig, devices } from "@playwright/test"

// First-time setup: run `bunx playwright install` to download browser binaries.
// When run via "bun run test:e2e" from repo root, cwd is the repo root.
const repoRoot = process.cwd()

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev:e2e",
    cwd: repoRoot,
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
