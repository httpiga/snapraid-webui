import "@/test-setup"
import { describe, test, expect } from "bun:test"
import { render } from "@testing-library/react"
import { PageLoading } from "./PageLoading"

describe("PageLoading", () => {
  test("renders skeleton placeholders", () => {
    const { container } = render(
      <PageLoading message="Loading configuration..." />,
    )
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  test("has accessible status with message", () => {
    const { container } = render(<PageLoading message="Please wait" />)
    const status = container.querySelector('[role="status"]')
    expect(status).not.toBeNull()
    expect(status?.getAttribute("aria-label")).toBe("Please wait")
  })
})
