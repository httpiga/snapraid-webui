import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CommandOptions } from "@/components/CommandOptions"
import {
  SyncSafetySettings,
  type SyncSafetyOptions,
} from "@/components/SyncSafetySettings"
import { useGetSyncSafetySettingsQuery } from "@/store/api"
import { Play, Square } from "lucide-react"
import type { CommandConfig } from "@/lib/command-config"

interface CommandOptionsCardProps {
  selectedCommand: CommandConfig | null
  options: Record<string, unknown>
  syncSafetyOptions?: SyncSafetyOptions
  isCommandRunning: boolean
  currentCommand: string | null
  onOptionsChange: (value: Record<string, unknown>) => void
  onSyncSafetyOptionsChange?: (value: SyncSafetyOptions) => void
  onRun: (command: CommandConfig) => void
  onAbort: () => void
}

export function CommandOptionsCard({
  selectedCommand,
  options,
  syncSafetyOptions,
  isCommandRunning,
  currentCommand,
  onOptionsChange,
  onSyncSafetyOptionsChange,
  onRun,
  onAbort,
}: CommandOptionsCardProps) {
  const { data: defaultSyncSafetySettings } = useGetSyncSafetySettingsQuery()
  const isSyncCommand = selectedCommand?.command === "sync"

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {selectedCommand ? selectedCommand.name : "Options"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isSyncCommand && syncSafetyOptions && onSyncSafetyOptionsChange ? (
          <SyncSafetySettings
            value={syncSafetyOptions}
            onChange={onSyncSafetyOptionsChange}
            defaultSettings={defaultSyncSafetySettings}
          />
        ) : (
          <CommandOptions
            commandConfig={selectedCommand}
            value={options}
            onChange={onOptionsChange}
          />
        )}

        {selectedCommand && (
          <div className="mt-6 flex gap-2">
            {isCommandRunning && currentCommand === selectedCommand.command ? (
              <Button variant="destructive" onClick={onAbort}>
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={() => onRun(selectedCommand)}
                disabled={isCommandRunning}
              >
                <Play className="h-4 w-4 mr-1" />
                Run {selectedCommand.name}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
