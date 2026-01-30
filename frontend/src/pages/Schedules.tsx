import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CommandBadge } from "@/components/ui/command-badge";
import { CommandSelect } from "@/components/ui/command-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CommandOptions } from "@/components/CommandOptions";
import {
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
} from "@/store/api";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Calendar, Clock } from "lucide-react";
import type { Schedule, SnapRaidCommand } from "@shared/types";
import {
  schedulableCommands,
  getCommandConfig,
  optionsToArgs,
  argsToOptions,
} from "@/lib/command-config";

const CRON_PRESETS = [
  { label: "Every day at 2 AM", value: "0 2 * * *" },
  { label: "Every day at 3 AM", value: "0 3 * * *" },
  { label: "Every Sunday at 4 AM", value: "0 4 * * 0" },
  { label: "Every Monday at 2 AM", value: "0 2 * * 1" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
  { label: "Custom", value: "custom" },
];

interface ScheduleFormData {
  name: string;
  command: SnapRaidCommand;
  cronExpression: string;
  enabled: boolean;
}

/** Option values for the selected command (key -> value) */
type OptionValues = Record<string, unknown>;

export function Schedules() {
  const { data: schedules, isLoading } = useGetSchedulesQuery();
  const [createSchedule] = useCreateScheduleMutation();
  const [updateSchedule] = useUpdateScheduleMutation();
  const [deleteSchedule] = useDeleteScheduleMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [cronPreset, setCronPreset] = useState("custom");
  const [formData, setFormData] = useState<ScheduleFormData>({
    name: "",
    command: "sync",
    cronExpression: "0 2 * * *",
    enabled: true,
  });
  const [optionValues, setOptionValues] = useState<OptionValues>({});

  const selectedCommandConfig = getCommandConfig(formData.command);

  const resetForm = () => {
    setFormData({
      name: "",
      command: "sync",
      cronExpression: "0 2 * * *",
      enabled: true,
    });
    setOptionValues({});
    setCronPreset("0 2 * * *");
    setEditingSchedule(null);
    setShowForm(false);
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      command: schedule.command,
      cronExpression: schedule.cronExpression,
      enabled: schedule.enabled,
    });
    const cmdConfig = getCommandConfig(schedule.command);
    setOptionValues(
      cmdConfig ? argsToOptions(cmdConfig, schedule.args ?? []) : {}
    );

    const preset = CRON_PRESETS.find(
      (p) => p.value === schedule.cronExpression
    );
    setCronPreset(preset ? preset.value : "custom");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const args = selectedCommandConfig
      ? optionsToArgs(selectedCommandConfig, optionValues)
      : [];

    try {
      if (editingSchedule) {
        await updateSchedule({
          id: editingSchedule.id,
          updates: { ...formData, args },
        }).unwrap();
        toast.success("Schedule updated");
      } else {
        await createSchedule({
          ...formData,
          enabled: true,
          configPath: "",
          args,
        }).unwrap();
        toast.success("Schedule created");
      }
      resetForm();
    } catch (error) {
      toast.error("Error", { description: String(error) });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;

    try {
      await deleteSchedule(id).unwrap();
      toast.success("Schedule deleted");
    } catch (error) {
      toast.error("Error", { description: String(error) });
    }
  };

  const handleToggleEnabled = async (schedule: Schedule) => {
    try {
      await updateSchedule({
        id: schedule.id,
        updates: { enabled: !schedule.enabled },
      }).unwrap();
    } catch (error) {
      toast.error("Error", { description: String(error) });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading schedules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
          <p className="text-muted-foreground">
            Automate sync and scrub operations
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Schedule
        </Button>
      </div>

      {/* Schedule Form Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Schedule" : "New Schedule"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="command">Command</Label>
                <CommandSelect
                  value={formData.command}
                  onValueChange={(value) => {
                    const cmd = value as SnapRaidCommand;
                    setFormData({ ...formData, command: cmd });
                    setOptionValues({});
                  }}
                  commands={schedulableCommands}
                  placeholder="Select command"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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
                    setCronPreset(value);
                    if (value !== "custom") {
                      setFormData({ ...formData, cronExpression: value });
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRON_PRESETS.map((preset) => (
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
                      setFormData({
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
                  <CommandOptions
                    commandConfig={selectedCommandConfig ?? null}
                    value={optionValues}
                    onChange={setOptionValues}
                  />
                </CardContent>
              </Card>
            </div>

            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSchedule ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedules List */}
      <div className="grid gap-4">
        {schedules && schedules.length > 0 ? (
          schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={() => handleToggleEnabled(schedule)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{schedule.name}</h3>
                        <Badge
                          variant={schedule.enabled ? "default" : "secondary"}
                        >
                          {schedule.enabled ? "Active" : "Disabled"}
                        </Badge>
                        <CommandBadge command={schedule.command} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {schedule.cronExpression}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last: {formatDate(schedule.lastRun)}
                        </div>
                        <div>Next: {formatDate(schedule.nextRun)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(schedule)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No schedules configured. Create one to automate SnapRAID
              operations.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
