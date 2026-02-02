import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SyncSafetySettings } from "@shared/types";

interface SyncSafetySettingsTabProps {
  safetySettings: SyncSafetySettings;
  setSafetySettings: React.Dispatch<
    React.SetStateAction<SyncSafetySettings>
  >;
  onSave: () => Promise<void>;
}

export function SyncSafetySettingsTab({
  safetySettings,
  setSafetySettings,
  onSave,
}: SyncSafetySettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sync Safety Settings</CardTitle>
          <CardDescription>
            Prevent accidental data loss during sync operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Safety Checks</Label>
              <p className="text-sm text-muted-foreground">
                Halt sync if too many files are deleted, updated, or added
              </p>
            </div>
            <Switch
              checked={safetySettings.enabled}
              onCheckedChange={(checked) =>
                setSafetySettings({ ...safetySettings, enabled: checked })
              }
            />
          </div>
          {safetySettings.enabled && (
            <>
              <div className="space-y-2">
                <Label>Maximum Deleted Files</Label>
                <Input
                  type="number"
                  value={safetySettings.maxDeletedFiles}
                  onChange={(e) =>
                    setSafetySettings({
                      ...safetySettings,
                      maxDeletedFiles: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Halt sync if more than this many files are deleted
                </p>
              </div>

              <div className="space-y-2">
                <Label>Maximum Updated Files</Label>
                <Input
                  type="number"
                  value={safetySettings.maxUpdatedFiles}
                  onChange={(e) =>
                    setSafetySettings({
                      ...safetySettings,
                      maxUpdatedFiles: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Halt sync if more than this many files are modified
                </p>
              </div>

              <div className="space-y-2">
                <Label>Maximum Added Files</Label>
                <Input
                  type="number"
                  value={safetySettings.maxAddedFiles}
                  onChange={(e) =>
                    setSafetySettings({
                      ...safetySettings,
                      maxAddedFiles: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Halt sync if more than this many files are added
                </p>
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <div>
              <Label>Pre-hash</Label>
              <p className="text-sm text-muted-foreground">
                Verify data before syncing (reads data twice for extra safety)
              </p>
            </div>
            <Switch
              checked={safetySettings.preHash}
              onCheckedChange={(checked) =>
                setSafetySettings({
                  ...safetySettings,
                  preHash: checked,
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Force Empty</Label>
              <p className="text-sm text-muted-foreground">
                Allow sync when all original files are missing (use with
                caution)
              </p>
            </div>
            <Switch
              checked={safetySettings.forceEmpty}
              onCheckedChange={(checked) =>
                setSafetySettings({
                  ...safetySettings,
                  forceEmpty: checked,
                })
              }
            />
          </div>

          <Button onClick={onSave}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
