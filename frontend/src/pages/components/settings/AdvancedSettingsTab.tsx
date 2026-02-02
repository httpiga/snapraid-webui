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
import type { AdvancedSettings } from "@shared/types";

interface AdvancedSettingsTabProps {
  advanced: AdvancedSettings;
  setAdvanced: React.Dispatch<React.SetStateAction<AdvancedSettings>>;
  onSave: () => Promise<void>;
}

export function AdvancedSettingsTab({
  advanced,
  setAdvanced,
  onSave,
}: AdvancedSettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advanced SnapRAID Options</CardTitle>
          <CardDescription>
            Configure advanced command-line flags for SnapRAID operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Spin-down on error</Label>
              <p className="text-sm text-muted-foreground">
                On error, spin down disks before exiting. Useful for
                scheduled/unattended sync.
              </p>
            </div>
            <Switch
              checked={advanced.spinDownOnError}
              onCheckedChange={(checked) =>
                setAdvanced({ ...advanced, spinDownOnError: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bwLimit">Bandwidth limit (Bytes/s)</Label>
            <Input
              id="bwLimit"
              type="text"
              placeholder="e.g. 100M, 1G"
              value={advanced.bwLimit}
              onChange={(e) =>
                setAdvanced({ ...advanced, bwLimit: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Limit disk throughput so sync doesn't saturate the system. The
              RATE is the number of bytes per second. You can specify a
              multiplier such as K, M, or G. Leave empty to disable.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Force UUID</Label>
              <p className="text-sm text-muted-foreground">
                Allow sync/check/fix when disk UUIDs changed (e.g. after
                replacing a disk). Recovery scenario.
              </p>
            </div>
            <Switch
              checked={advanced.forceUuid}
              onCheckedChange={(checked) =>
                setAdvanced({ ...advanced, forceUuid: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="errorLimit">Error limit</Label>
            <Input
              id="errorLimit"
              type="number"
              placeholder="e.g. 200"
              value={advanced.errorLimit}
              onChange={(e) =>
                setAdvanced({
                  ...advanced,
                  errorLimit: parseInt(e.target.value) || 0,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Allow more than 100 I/O errors before stopping (sync, scrub). 0 =
              use SnapRAID default.
            </p>
          </div>

          <Button onClick={onSave}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
