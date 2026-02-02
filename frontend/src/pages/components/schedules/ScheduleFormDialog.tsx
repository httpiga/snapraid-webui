import type { FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommandSelect } from "@/components/ui/command-select";
import { CommandOptions } from "@/components/CommandOptions";
import {
  SyncSafetySettings,
  type SyncSafetyOptions,
} from "@/components/SyncSafetySettings";
import type { SnapRaidCommand, SyncSafetySettings as SyncSafetySettingsType } from "@shared/types";
import type { CommandConfig } from "@/lib/command-config";

export interface ScheduleFormData {
  name: string;
  command: SnapRaidCommand;
  cronExpression: string;
  enabled: boolean;
}

interface CronPreset {
  label: string;
  value: string;
}

interface ScheduleFormDialogProps {
  open: boolean;
  editingLabel: string;
  submitLabel: string;
  formData: ScheduleFormData;
  cronPreset: string;
  cronPresets: CronPreset[];
  commands: CommandConfig[];
  optionValues: Record<string, unknown>;
  syncSafetyOptions: SyncSafetyOptions;
  selectedCommandConfig: CommandConfig | null;
  defaultSyncSafetySettings?: SyncSafetySettingsType | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  onFormDataChange: (data: ScheduleFormData) => void;
  onCronPresetChange: (value: string) => void;
  onOptionValuesChange: (value: Record<string, unknown>) => void;
  onSyncSafetyOptionsChange: (value: SyncSafetyOptions) => void;
}

export function ScheduleFormDialog({
  open,
  editingLabel,
  submitLabel,
  formData,
  cronPreset,
  cronPresets,
  commands,
  optionValues,
  syncSafetyOptions,
  selectedCommandConfig,
  defaultSyncSafetySettings,
  onOpenChange,
  onSubmit,
  onCancel,
  onFormDataChange,
  onCronPresetChange,
  onOptionValuesChange,
  onSyncSafetyOptionsChange,
}: ScheduleFormDialogProps) {
  const isSyncCommand = formData.command === "sync";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="command">Command</Label>
              <CommandSelect
                value={formData.command}
                onValueChange={(value) => {
                  const cmd = value as SnapRaidCommand;
                  onFormDataChange({ ...formData, command: cmd });
                  onOptionValuesChange({});
                }}
                commands={commands}
                placeholder="Select command"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  onFormDataChange({ ...formData, name: e.target.value })
                }
                placeholder="Daily Sync"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule</Label>
              <Select
                value={cronPreset}
                onValueChange={(value) => {
                  onCronPresetChange(value);
                  if (value !== "custom") {
                    onFormDataChange({ ...formData, cronExpression: value });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cronPresets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {cronPreset === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="cron">Cron Expression</Label>
                <Input
                  id="cron"
                  value={formData.cronExpression}
                  onChange={(e) =>
                    onFormDataChange({
                      ...formData,
                      cronExpression: e.target.value,
                    })
                  }
                  placeholder="0 2 * * *"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Format: minute hour day month weekday
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            <Card>
              <CardContent>
                {isSyncCommand ? (
                  <SyncSafetySettings
                    value={syncSafetyOptions}
                    onChange={onSyncSafetyOptionsChange}
                    defaultSettings={defaultSyncSafetySettings}
                  />
                ) : (
                  <CommandOptions
                    commandConfig={selectedCommandConfig}
                    value={optionValues}
                    onChange={onOptionValuesChange}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
