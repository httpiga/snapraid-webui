import type { SyncSafetySettings } from "@snapraid-webui/shared"

export type DiffCounts = {
  deletedFiles: number
  modifiedFiles: number
  newFiles: number
}

/**
 * Pure validation: compute sync safety violation messages from diff counts and settings.
 * Used by snapraid-runner and tests.
 */
export function computeSyncSafetyViolations(
  diff: DiffCounts,
  settings: SyncSafetySettings,
): string[] {
  const violations: string[] = []

  if (diff.deletedFiles > settings.maxDeletedFiles) {
    violations.push(
      `Deleted files (${diff.deletedFiles}) exceeds limit (${settings.maxDeletedFiles})`,
    )
  }
  if (diff.modifiedFiles > settings.maxUpdatedFiles) {
    violations.push(
      `Updated files (${diff.modifiedFiles}) exceeds limit (${settings.maxUpdatedFiles})`,
    )
  }
  if (diff.newFiles > settings.maxAddedFiles) {
    violations.push(
      `Added files (${diff.newFiles}) exceeds limit (${settings.maxAddedFiles})`,
    )
  }

  return violations
}
