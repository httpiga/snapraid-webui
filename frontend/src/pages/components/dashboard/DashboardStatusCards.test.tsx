import "@/test-setup"
import { describe, test, expect } from "bun:test"
import { render } from "@testing-library/react"
import { DashboardStatusCards } from "./DashboardStatusCards"

describe("DashboardStatusCards", () => {
  test('shows "Up to Date" when parity is up to date', () => {
    render(
      <DashboardStatusCards
        status={{
          hasErrors: false,
          parityUpToDate: true,
          newFiles: 0,
          modifiedFiles: 0,
          deletedFiles: 0,
          rawOutput: "",
        }}
      />,
    )

    expect(document.body.textContent).toContain("Up to Date")
  })

  test('shows "Sync in Progress" only while a sync is in progress', () => {
    render(
      <DashboardStatusCards
        status={{
          hasErrors: false,
          parityUpToDate: false,
          syncInProgress: true,
          newFiles: 0,
          modifiedFiles: 0,
          deletedFiles: 0,
          rawOutput: "",
        }}
      />,
    )

    expect(document.body.textContent).toContain("Sync in Progress")
    expect(document.body.textContent).not.toContain("Sync Required")
  })

  test('shows "Sync Required" when parity is out of date but no sync is running', () => {
    render(
      <DashboardStatusCards
        status={{
          hasErrors: false,
          parityUpToDate: false,
          syncInProgress: false,
          newFiles: 2,
          modifiedFiles: 1,
          deletedFiles: 0,
          rawOutput: "",
        }}
      />,
    )

    expect(document.body.textContent).toContain("Sync Required")
    expect(document.body.textContent).not.toContain("Sync in Progress")
  })
})
