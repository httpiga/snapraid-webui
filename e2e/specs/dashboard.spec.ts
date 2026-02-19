import { test, expect } from "@playwright/test"

test("dashboard page loads and shows main heading", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 15_000,
  })
})
