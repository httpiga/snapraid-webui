import { test, expect } from "@playwright/test"

test("operations page shows command options when Sync is selected", async ({
  page,
}) => {
  await page.goto("/operations")
  await expect(
    page.getByRole("heading", { name: "Operations" }),
  ).toBeVisible()

  await page
    .locator("[data-slot='card']")
    .filter({ hasText: "Commands" })
    .getByRole("combobox")
    .click()
  await page.getByRole("option", { name: /^Sync\s/ }).first().click()

  await expect(page.getByRole("button", { name: /Run Sync/i })).toBeVisible()
})
