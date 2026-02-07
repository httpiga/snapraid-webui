import { describe, test, expect } from "bun:test"
import { cn } from "./utils"

describe("cn", () => {
  test("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  test("handles conditional classes", () => {
    expect(cn("base", false, "visible")).toContain("base")
    expect(cn("base", false, "visible")).toContain("visible")
  })

  test("handles single argument", () => {
    expect(cn("single")).toBe("single")
  })
})
