import { useReducer, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import {
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useGetSyncSafetySettingsQuery,
} from "@/store/api"
import type { Schedule } from "@shared/types"
import {
  schedulableCommands,
  getCommandConfig,
  optionsToArgs,
  argsToOptions,
  syncSafetyToArgs,
  argsToSyncSafety,
} from "@/lib/command-config"
import type { SyncSafetyOptions } from "@/components/SyncSafetySettings"
import { PageHeader } from "@/pages/components/PageHeader"
import { PageLoading } from "@/pages/components/PageLoading"
import {
  ScheduleFormDialog,
  type ScheduleFormData,
} from "@/pages/components/schedules/ScheduleFormDialog"
import { ScheduleList } from "@/pages/components/schedules/ScheduleList"
import { getApiErrorMessage } from "@/lib/api-error"

const CRON_PRESETS = [
  { label: "Every day at 2 AM", value: "0 2 * * *" },
  { label: "Every day at 3 AM", value: "0 3 * * *" },
  { label: "Every Sunday at 4 AM", value: "0 4 * * 0" },
  { label: "Every Monday at 2 AM", value: "0 2 * * 1" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
  { label: "Custom", value: "custom" },
]

/** Option values for the selected command (key -> value) */
type OptionValues = Record<string, unknown>

const initialFormData: ScheduleFormData = {
  name: "",
  command: "sync",
  cronExpression: "0 2 * * *",
  enabled: true,
}

const initialSyncSafetyOptions: SyncSafetyOptions = {
  mode: "default",
  preHash: false,
  forceEmpty: false,
  maxDeletedFiles: 100,
  maxUpdatedFiles: 500,
  maxAddedFiles: 10000,
}

type SchedulesFormState = {
  showForm: boolean
  editingSchedule: Schedule | null
  cronPreset: string
  formData: ScheduleFormData
  optionValues: OptionValues
  syncSafetyOptions: SyncSafetyOptions
}

const initialState: SchedulesFormState = {
  showForm: false,
  editingSchedule: null,
  cronPreset: "0 2 * * *",
  formData: initialFormData,
  optionValues: {},
  syncSafetyOptions: initialSyncSafetyOptions,
}

type SchedulesFormAction =
  | { type: "RESET" }
  | { type: "OPEN_NEW" }
  | { type: "EDIT"; schedule: Schedule }
  | { type: "SET_FORM_DATA"; payload: ScheduleFormData }
  | { type: "SET_CRON_PRESET"; payload: string }
  | { type: "SET_OPTION_VALUES"; payload: OptionValues }
  | { type: "SET_SYNC_SAFETY_OPTIONS"; payload: SyncSafetyOptions }
  | { type: "SET_SHOW_FORM"; payload: boolean }

function schedulesFormReducer(
  state: SchedulesFormState,
  action: SchedulesFormAction,
): SchedulesFormState {
  switch (action.type) {
    case "RESET":
      return initialState
    case "OPEN_NEW":
      return { ...initialState, showForm: true }
    case "EDIT": {
      const schedule = action.schedule
      const formData: ScheduleFormData = {
        name: schedule.name,
        command: schedule.command,
        cronExpression: schedule.cronExpression,
        enabled: schedule.enabled,
      }
      const syncSafetyOptions =
        schedule.command === "sync"
          ? argsToSyncSafety(schedule.args ?? [], schedule.syncSafetyMode)
          : state.syncSafetyOptions
      const optionValues =
        schedule.command !== "sync"
          ? (() => {
              const cmdConfig = getCommandConfig(schedule.command)
              return cmdConfig
                ? argsToOptions(cmdConfig, schedule.args ?? [])
                : {}
            })()
          : {}
      const preset = CRON_PRESETS.find(
        (p) => p.value === schedule.cronExpression,
      )
      return {
        ...state,
        showForm: true,
        editingSchedule: schedule,
        formData,
        cronPreset: preset ? preset.value : "custom",
        optionValues,
        syncSafetyOptions,
      }
    }
    case "SET_FORM_DATA":
      return { ...state, formData: action.payload }
    case "SET_CRON_PRESET":
      return { ...state, cronPreset: action.payload }
    case "SET_OPTION_VALUES":
      return { ...state, optionValues: action.payload }
    case "SET_SYNC_SAFETY_OPTIONS":
      return { ...state, syncSafetyOptions: action.payload }
    case "SET_SHOW_FORM":
      return { ...state, showForm: action.payload }
    default:
      return state
  }
}

export function Schedules() {
  const { data: schedules, isLoading } = useGetSchedulesQuery()
  const { data: defaultSyncSafetySettings } = useGetSyncSafetySettingsQuery()
  const [createSchedule] = useCreateScheduleMutation()
  const [updateSchedule] = useUpdateScheduleMutation()
  const [deleteSchedule] = useDeleteScheduleMutation()

  const [state, dispatch] = useReducer(schedulesFormReducer, initialState)
  const {
    showForm,
    editingSchedule,
    cronPreset,
    formData,
    optionValues,
    syncSafetyOptions,
  } = state

  const selectedCommandConfig = getCommandConfig(formData.command) ?? null

  const resetForm = () => dispatch({ type: "RESET" })

  const handleEdit = (schedule: Schedule) => {
    dispatch({ type: "EDIT", schedule })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    let args: string[]

    // For sync commands, use sync safety settings
    if (formData.command === "sync") {
      args = syncSafetyToArgs(
        syncSafetyOptions.mode,
        syncSafetyOptions,
        defaultSyncSafetySettings,
      )
    } else {
      args = selectedCommandConfig
        ? optionsToArgs(selectedCommandConfig, optionValues)
        : []
    }

    try {
      if (editingSchedule) {
        await updateSchedule({
          id: editingSchedule.id,
          updates: {
            ...formData,
            args,
            syncSafetyMode:
              formData.command === "sync" ? syncSafetyOptions.mode : undefined,
          },
        }).unwrap()
        toast.success("Schedule updated")
      } else {
        await createSchedule({
          ...formData,
          enabled: true,
          configPath: "",
          args,
          syncSafetyMode:
            formData.command === "sync" ? syncSafetyOptions.mode : undefined,
        }).unwrap()
        toast.success("Schedule created")
      }
      resetForm()
    } catch (error) {
      toast.error("Error", { description: getApiErrorMessage(error) })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return

    try {
      await deleteSchedule(id).unwrap()
      toast.success("Schedule deleted")
    } catch (error) {
      toast.error("Error", { description: getApiErrorMessage(error) })
    }
  }

  const handleToggleEnabled = async (schedule: Schedule) => {
    try {
      await updateSchedule({
        id: schedule.id,
        updates: { enabled: !schedule.enabled },
      }).unwrap()
    } catch (error) {
      toast.error("Error", { description: getApiErrorMessage(error) })
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return <PageLoading message="Loading schedules..." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedules"
        description="Automate sync and scrub operations"
        actions={
          <Button onClick={() => dispatch({ type: "OPEN_NEW" })}>
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
        syncSafetyOptions={syncSafetyOptions}
        selectedCommandConfig={selectedCommandConfig}
        defaultSyncSafetySettings={defaultSyncSafetySettings}
        onOpenChange={(open) => {
          if (!open) resetForm()
        }}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        onFormDataChange={(payload) =>
          dispatch({ type: "SET_FORM_DATA", payload })
        }
        onCronPresetChange={(payload) =>
          dispatch({ type: "SET_CRON_PRESET", payload })
        }
        onOptionValuesChange={(payload) =>
          dispatch({ type: "SET_OPTION_VALUES", payload })
        }
        onSyncSafetyOptionsChange={(payload) =>
          dispatch({ type: "SET_SYNC_SAFETY_OPTIONS", payload })
        }
      />

      <ScheduleList
        schedules={schedules ?? []}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleEnabled={handleToggleEnabled}
        formatDate={formatDate}
      />
    </div>
  )
}
