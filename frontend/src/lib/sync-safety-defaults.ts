import type { SyncSafetyOptions } from "@/components/SyncSafetySettings"

export const DEFAULT_SYNC_SAFETY_OPTIONS: SyncSafetyOptions = {
  mode: "default",
  preHash: false,
  forceEmpty: false,
  maxDeletedFiles: 100,
  maxUpdatedFiles: 500,
  maxAddedFiles: 10000,
}
