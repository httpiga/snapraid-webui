/**
 * Returns the next available data disk name (d1, d2, ...) that does not
 * conflict with existing keys. Uses the maximum existing number + 1 so that
 * adding a disk after removing an earlier one does not overwrite existing entries.
 */
export function getNextDataDiskName(data: Record<string, string>): string {
  const keys = Object.keys(data)
  let max = 0
  for (const key of keys) {
    const match = key.match(/^d(\d+)$/)
    if (match) {
      const n = Number.parseInt(match[1], 10)
      if (n > max) max = n
    }
  }
  return `d${max + 1}`
}
