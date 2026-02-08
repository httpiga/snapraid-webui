import type { FixCommandOptions } from "@shared/types"

/**
 * Build SnapRAID fix command CLI args from recovery options.
 * Maps: filter → -f, filterMissing → -m, filterError → -e, filterDisk → -d.
 */
export function buildFixArgs(options: FixCommandOptions): string[] {
  const args: string[] = []

  if (options.filter) {
    args.push("-f", options.filter)
  }
  if (options.filterMissing) {
    args.push("-m")
  }
  if (options.filterError) {
    args.push("-e")
  }
  if (options.filterDisk) {
    args.push("-d", options.filterDisk)
  }

  return args
}
