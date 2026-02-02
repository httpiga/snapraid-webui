import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SyncSafetySettings as SyncSafetySettingsType } from "@shared/types";

export type SyncSafetyMode = "disabled" | "default" | "custom";

export interface SyncSafetyOptions {
  mode: SyncSafetyMode;
  preHash: boolean;
  forceEmpty: boolean;
  maxDeletedFiles?: number;
  maxUpdatedFiles?: number;
  maxAddedFiles?: number;
}

interface SyncSafetySettingsProps {
  value: SyncSafetyOptions;
  onChange: (value: SyncSafetyOptions) => void;
  defaultSettings?: SyncSafetySettingsType | null;
}

/**
 * Reusable sync safety settings component for both Operations and Schedules.
 * Includes mode selection (disabled/default/custom), pre-hash, force-empty,
 * and conditional max deleted/updated/added files fields.
 *
 * Note: Some advanced SnapRAID sync flags are intentionally not exposed:
 * - --force-zero: Allows syncing files that were truncated to zero size after
 *   a crash. This is risky as it could hide data corruption, so it's not
 *   exposed in the UI for safety.
 * - Other advanced flags (-U, -N, -F, -R, -s, -w, -l, -L, -S, -B): These are
 *   expert-level options that users can add via CLI if needed.
 */
export function SyncSafetySettings({
  value,
  onChange,
  defaultSettings,
}: SyncSafetySettingsProps) {
  const showCustomFields = value.mode === "custom";
  const showAdvancedOptions = value.mode !== "default";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sync Safety Mode</Label>
        <Select
          value={value.mode}
          onValueChange={(mode: SyncSafetyMode) => onChange({ ...value, mode })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Use Settings Default</SelectItem>
            <SelectItem value="custom">Custom Settings</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {value.mode === "default" && defaultSettings && (
            <>
              {defaultSettings.enabled ? (
                <>
                  Using: {defaultSettings.maxDeletedFiles} deleted,{" "}
                  {defaultSettings.maxUpdatedFiles} updated,{" "}
                  {defaultSettings.maxAddedFiles} added
                  {defaultSettings.preHash && ", pre-hash"}
                  {defaultSettings.forceEmpty && ", force-empty"}
                </>
              ) : (
                <>Disabled</>
              )}
            </>
          )}
          {value.mode === "custom" &&
            "Configure custom thresholds for this operation"}
          {value.mode === "disabled" &&
            "No safety checks - allows unlimited file changes"}
        </p>
      </div>

      {showCustomFields && (
        <>
          <div className="space-y-2">
            <Label>Maximum Deleted Files</Label>
            <Input
              type="number"
              value={value.maxDeletedFiles ?? 0}
              onChange={(e) =>
                onChange({
                  ...value,
                  maxDeletedFiles: parseInt(e.target.value) || 0,
                })
              }
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground">
              Halt sync if more than this many files are deleted
            </p>
          </div>

          <div className="space-y-2">
            <Label>Maximum Updated Files</Label>
            <Input
              type="number"
              value={value.maxUpdatedFiles ?? 0}
              onChange={(e) =>
                onChange({
                  ...value,
                  maxUpdatedFiles: parseInt(e.target.value) || 0,
                })
              }
              placeholder="500"
            />
            <p className="text-xs text-muted-foreground">
              Halt sync if more than this many files are modified
            </p>
          </div>

          <div className="space-y-2">
            <Label>Maximum Added Files</Label>
            <Input
              type="number"
              value={value.maxAddedFiles ?? 0}
              onChange={(e) =>
                onChange({
                  ...value,
                  maxAddedFiles: parseInt(e.target.value) || 0,
                })
              }
              placeholder="10000"
            />
            <p className="text-xs text-muted-foreground">
              Halt sync if more than this many files are added
            </p>
          </div>
        </>
      )}

      {showAdvancedOptions && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <Label>Pre-hash</Label>
              <p className="text-xs text-muted-foreground">
                Verify data before syncing
              </p>
            </div>
            <Switch
              checked={value.preHash}
              onCheckedChange={(checked) =>
                onChange({ ...value, preHash: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Force Empty</Label>
              <p className="text-xs text-muted-foreground">
                Allow sync when all original files are missing (use with
                caution)
              </p>
            </div>
            <Switch
              checked={value.forceEmpty}
              onCheckedChange={(checked) =>
                onChange({ ...value, forceEmpty: checked })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
