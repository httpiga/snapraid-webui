import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
} from "@/store/api";
import type { Schedule, SnapRaidCommand } from "@shared/types";
import {
  schedulableCommands,
  getCommandConfig,
  optionsToArgs,
  argsToOptions,
} from "@/lib/command-config";
import { PageHeader } from "@/pages/components/PageHeader";
import { PageLoading } from "@/pages/components/PageLoading";
import {
  ScheduleFormDialog,
  type ScheduleFormData,
} from "@/pages/components/schedules/ScheduleFormDialog";
import { ScheduleList } from "@/pages/components/schedules/ScheduleList";

const CRON_PRESETS = [
  { label: "Every day at 2 AM", value: "0 2 * * *" },
  { label: "Every day at 3 AM", value: "0 3 * * *" },
  { label: "Every Sunday at 4 AM", value: "0 4 * * 0" },
  { label: "Every Monday at 2 AM", value: "0 2 * * 1" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
  { label: "Custom", value: "custom" },
];

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
      (presetOption) => presetOption.value === schedule.cronExpression
    );
    setCronPreset(preset ? preset.value : "custom");
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
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
    return <PageLoading message="Loading schedules..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedules"
        description="Automate sync and scrub operations"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Schedule
          </Button>
        }
      />

      <ScheduleFormDialog
        open={showForm}
        editingLabel={editingSchedule ? "Edit Schedule" : "New Schedule"}
        submitLabel={editingSchedule ? "Update" : "Create"}
        formData={formData}
        cronPreset={cronPreset}
        cronPresets={CRON_PRESETS}
        commands={schedulableCommands}
        optionValues={optionValues}
        selectedCommandConfig={selectedCommandConfig}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        onFormDataChange={setFormData}
        onCronPresetChange={setCronPreset}
        onOptionValuesChange={setOptionValues}
      />

      <ScheduleList
        schedules={schedules ?? []}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleEnabled={handleToggleEnabled}
        formatDate={formatDate}
      />
    </div>
  );
}
