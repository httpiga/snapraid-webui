export interface FixOptions {
  filterPath?: string
  filterMissing?: boolean
  filterError?: boolean
  filterDisk?: string
}

/**
 * Build SnapRAID fix command CLI args from recovery options.
 * Maps: filterPath → -f, filterMissing → -m, filterError → -e, filterDisk → -d.
 */
export function buildFixArgs(options: FixOptions): string[] {
  const args: string[] = []

  if (options.filterPath) {
    args.push("-f", options.filterPath)
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
