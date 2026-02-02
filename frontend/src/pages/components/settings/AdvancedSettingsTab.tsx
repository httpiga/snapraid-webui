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
import { useEffect, useState } from "react";
import {
  useGetAdvancedSettingsQuery,
  useUpdateAdvancedSettingsMutation,
} from "@/store/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { PageLoading } from "@/pages/components/PageLoading";

export function AdvancedSettingsTab() {
  const { data: advancedSettings, isLoading } = useGetAdvancedSettingsQuery();
  const [updateAdvancedSettings] = useUpdateAdvancedSettingsMutation();
  const [advanced, setAdvanced] = useState<AdvancedSettings | null>(null);

  useEffect(() => {
    if (advancedSettings) {
      setAdvanced(advancedSettings);
    }
  }, [advancedSettings]);

  const handleSave = async () => {
    if (!advanced) return;
    try {
      await updateAdvancedSettings(advanced).unwrap();
      toast.success("Advanced settings saved");
    } catch (error) {
      toast.error("Failed to save advanced settings", {
        description: getApiErrorMessage(error),
      });
    }
  };

  if (isLoading || !advanced) {
    return <PageLoading message="Loading advanced settings..." />;
  }

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

          <Button onClick={handleSave}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
