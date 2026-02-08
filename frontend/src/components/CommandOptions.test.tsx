import "@/test-setup"
import { describe, test, expect } from "bun:test"
import { render } from "@testing-library/react"
import { CommandOptions } from "./CommandOptions"
import type { CommandConfig } from "@/lib/command-config"

function mockConfig(options: CommandConfig["options"]): CommandConfig {
  return {
    name: "Scrub",
    command: "scrub",
    description: "Scrub command",
    longRunning: true,
    options,
  }
}

describe("CommandOptions", () => {
  test("shows message when commandConfig is null", () => {
    render(
      <CommandOptions
        commandConfig={null}
        value={{}}
        onChange={() => {}}
      />,
    )
    expect(document.body.textContent).toContain("Select a command to see options")
  })

  test("shows message when config has no options", () => {
    render(
      <CommandOptions
        commandConfig={mockConfig([])}
        value={{}}
        onChange={() => {}}
      />,
    )
    expect(document.body.textContent).toContain("No additional options available")
  })

  test("renders string option with label and description", () => {
    render(
      <CommandOptions
        commandConfig={mockConfig([
          {
            name: "Plan",
            key: "plan",
            type: "string",
            description: "Percentage or bad/new/full",
            default: "8",
          },
        ])}
        value={{}}
        onChange={() => {}}
      />,
    )
    expect(document.body.textContent).toContain("Plan")
    expect(document.body.textContent).toContain("Percentage or bad/new/full")
    const input = document.querySelector('input[type="text"]')
    expect(input).not.toBeNull()
    expect((input as HTMLInputElement)?.placeholder).toBe("8")
  })

  test("renders boolean option with switch", () => {
    render(
      <CommandOptions
        commandConfig={mockConfig([
          {
            name: "Audit Only",
            key: "audit-only",
            type: "boolean",
            description: "Only check hashes",
          },
        ])}
        value={{}}
        onChange={() => {}}
      />,
    )
    expect(document.body.textContent).toContain("Audit Only")
    expect(document.body.textContent).toContain("Only check hashes")
    const role = document.querySelector('[role="switch"]')
    expect(role).not.toBeNull()
  })

})
