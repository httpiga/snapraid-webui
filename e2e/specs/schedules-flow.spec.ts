import { test, expect } from "@playwright/test"

test.describe("schedules flow", () => {
  test("opening and closing new schedule dialog", async ({ page }) => {
    await page.goto("/schedules")
    await expect(
      page.getByRole("heading", { name: "Schedules" }),
    ).toBeVisible()

    await page.getByRole("button", { name: /New Schedule/i }).click()
    const dialog = page.getByRole("dialog", { name: "New Schedule" })
    await expect(dialog).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "New Schedule" }),
    ).toBeVisible()

    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).not.toBeVisible()
  })

  test("create schedule and see it in the list", async ({ page }) => {
    const scheduleName = "E2E Test Schedule"
    await page.goto("/schedules")
    await page.getByRole("button", { name: /New Schedule/i }).click()
    await expect(page.getByRole("dialog", { name: "New Schedule" })).toBeVisible()

    await page.getByLabel("Name").fill(scheduleName)
    await page.getByRole("dialog").getByRole("combobox").nth(1).click()
    await page.getByRole("option", { name: "Every day at 2 AM" }).click()
    await page.getByRole("button", { name: "Create" }).click()

    await expect(page.getByRole("dialog", { name: "New Schedule" })).not.toBeVisible()
    await expect(page.getByRole("heading", { name: scheduleName }).first()).toBeVisible()
  })
})
