import "@/test-setup"
import { describe, test, expect } from "bun:test"
import { render } from "@testing-library/react"
import { PageHeader } from "./PageHeader"

describe("PageHeader", () => {
  test("renders title", () => {
    render(<PageHeader title="Dashboard" />)
    const heading = document.querySelector("h1")
    expect(heading).not.toBeNull()
    expect(heading?.textContent).toBe("Dashboard")
  })

  test("renders description when provided", () => {
    render(
      <PageHeader title="Settings" description="Manage app settings" />,
    )
    expect(document.body.textContent).toContain("Manage app settings")
  })

  test("omits description when not provided", () => {
    const { container } = render(<PageHeader title="Logs" />)
    const paragraphs = container.querySelectorAll("p")
    expect(paragraphs.length).toBe(0)
  })

  test("renders actions when provided", () => {
    const { getByRole } = render(
      <PageHeader
        title="Operations"
        actions={<button type="button">Run</button>}
      />,
    )
    const button = getByRole("button", { name: "Run" })
    expect(button).toBeDefined()
  })
})
