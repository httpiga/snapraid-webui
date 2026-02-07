import { describe, test, expect } from "bun:test"
import { getNextDataDiskName } from "./disk-config-utils"

describe("getNextDataDiskName", () => {
  test("returns d1 when data is empty", () => {
    expect(getNextDataDiskName({})).toBe("d1")
  })

  test("returns d3 when data has d1 and d2", () => {
    expect(getNextDataDiskName({ d1: "/path1", d2: "/path2" })).toBe("d3")
  })

  test("after adding disks then removing the first, next name does not overwrite existing disk", () => {
    // Precondition: existing config of two disks
    const twoDisks = { d1: "/mnt/d1", d2: "/mnt/d2" }
    // Add disks (don't save) -> d3, d4
    const afterAdd = {
      ...twoDisks,
      d3: "/mnt/d3",
      d4: "/mnt/d4",
    }
    // Remove the first disk
    const { d1: removed, ...afterRemoveFirst } = afterAdd
    expect(removed).toBe("/mnt/d1")
    expect(afterRemoveFirst).toEqual({
      d2: "/mnt/d2",
      d3: "/mnt/d3",
      d4: "/mnt/d4",
    })
    // Next name must be d5, not d4 (which would overwrite the last disk's path)
    const nextName = getNextDataDiskName(afterRemoveFirst)
    expect(nextName).toBe("d5")
  })

  test("uses max existing number when keys are non-contiguous", () => {
    expect(getNextDataDiskName({ d2: "/x", d3: "/y", d4: "/z" })).toBe("d5")
  })

  test("ignores non-dN keys when computing next name", () => {
    // If we ever had other key shapes, they should not affect the counter
    expect(getNextDataDiskName({ d1: "/a", d2: "/b" })).toBe("d3")
  })
})
