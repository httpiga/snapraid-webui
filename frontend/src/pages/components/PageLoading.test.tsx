import "@/test-setup"
import { describe, test, expect } from "bun:test"
import { render } from "@testing-library/react"
import { PageLoading } from "./PageLoading"

describe("PageLoading", () => {
  test("renders message", () => {
    render(<PageLoading message="Loading configuration..." />)
    expect(document.body.textContent).toContain("Loading configuration...")
  })

  test("uses muted-foreground class for message", () => {
    const { container } = render(
      <PageLoading message="Please wait" />,
    )
    const messageEl = container.querySelector(".text-muted-foreground")
    expect(messageEl).not.toBeNull()
    expect(messageEl?.textContent).toBe("Please wait")
  })
})
