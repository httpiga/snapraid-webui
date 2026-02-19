import { test, expect } from "@playwright/test"

test.describe("navigation and API smoke", () => {
  test("disks page loads with heading and tabs", async ({ page }) => {
    await page.goto("/disks")
    await expect(
      page.getByRole("heading", { name: "Disk Configuration" }),
    ).toBeVisible()
    await expect(page.getByRole("tab", { name: "Visual Editor" })).toBeVisible()
  })

  test("operations page loads with heading and command selection", async ({
    page,
  }) => {
    await page.goto("/operations")
    await expect(
      page.getByRole("heading", { name: "Operations" }),
    ).toBeVisible()
    await expect(page.getByText("Commands", { exact: true })).toBeVisible()
  })

  test("schedules page loads with heading and new schedule action", async ({
    page,
  }) => {
    await page.goto("/schedules")
    await expect(page.getByRole("heading", { name: "Schedules" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: /New Schedule/i }),
    ).toBeVisible()
  })

  test("recovery page loads with heading and main content", async ({
    page,
  }) => {
    await page.goto("/recovery")
    await expect(
      page.getByRole("heading", { name: "File Recovery" }),
    ).toBeVisible()
    await expect(
      page.getByText("Configure which files to recover"),
    ).toBeVisible()
  })

  test("logs page loads with heading and list or empty state", async ({
    page,
  }) => {
    await page.goto("/logs")
    await expect(page.getByRole("heading", { name: "Logs" })).toBeVisible()
    await expect(page.getByText(/log files? found/i).first()).toBeVisible()
  })

  test("settings page loads with heading and tabs", async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
    await expect(page.getByRole("tab").first()).toBeVisible()
  })
})
