import { useState } from "react";
import { useDispatch } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  api,
  useExecuteCommandMutation,
  useAbortCommandMutation,
  useGetSyncSafetySettingsQuery,
} from "@/store/api";
import { useWebSocket } from "@/hooks/use-websocket";
import {
  getCommandConfig,
  optionsToArgs,
  syncSafetyToArgs,
  type CommandConfig,
} from "@/lib/command-config";
import type { SyncSafetyOptions } from "@/components/SyncSafetySettings";
import type { SnapRaidCommand } from "@shared/types";
import { PageHeader } from "@/pages/components/PageHeader";
import { CommandSelectionCard } from "@/pages/components/operations/CommandSelectionCard";
import { CommandOptionsCard } from "@/pages/components/operations/CommandOptionsCard";
import { CommandOutputCard } from "@/pages/components/operations/CommandOutputCard";
import { getApiErrorMessage } from "@/lib/api-error";

export function Operations() {
  const dispatch = useDispatch();
  const [selectedCommand, setSelectedCommand] = useState<CommandConfig | null>(
    null
  );
  const [options, setOptions] = useState<Record<string, unknown>>({});
  const [syncSafetyOptions, setSyncSafetyOptions] = useState<SyncSafetyOptions>(
    {
      mode: "default",
      preHash: false,
      forceEmpty: false,
      maxDeletedFiles: 100,
      maxDeletedPercent: 10,
    }
  );
  const { data: defaultSyncSafetySettings } = useGetSyncSafetySettingsQuery();

  const {
    isConnected,
    isCommandRunning,
    currentCommand,
    output,
    setOutput,
    sendCommand,
    abort,
    clearOutput,
  } = useWebSocket({
    onComplete: (exitCode) => {
      dispatch(api.util.invalidateTags(["Status"]));
      if (exitCode === 0) {
        toast.success("Command completed", {
          description: `Exit code: ${exitCode}`,
        });
      } else {
        toast.error("Command failed", {
          description: `Exit code: ${exitCode}`,
        });
      }
    },
    onError: (error) => {
      toast.error("Command error", { description: error });
    },
  });

  const [executeCommand] = useExecuteCommandMutation();
  const [abortCommand] = useAbortCommandMutation();

  const handleRunCommand = async (cmd: CommandConfig) => {
    let args: string[];

    // For sync commands, use sync safety settings
    if (cmd.command === "sync") {
      args = syncSafetyToArgs(
        syncSafetyOptions.mode,
        syncSafetyOptions,
        defaultSyncSafetySettings
      );
    } else {
      args = optionsToArgs(cmd, options);
    }

    clearOutput();

    if (cmd.longRunning) {
      sendCommand(cmd.command, args);
    } else {
      try {
        const result = await executeCommand({
          command: cmd.command,
          args,
        }).unwrap();
        const response = result as { output?: string };
        setOutput(response.output ?? "");
        toast.success("Command completed", {
          description: `${cmd.name} executed successfully`,
        });
      } catch (error) {
        toast.error("Command failed", {
          description: getApiErrorMessage(error),
        });
      }
    }
  };

  const handleAbort = async () => {
    abort();
    await abortCommand();
  };

  const handleSelectCommand = (value: SnapRaidCommand | "") => {
    if (!value) {
      setSelectedCommand(null);
      setOptions({});
      setSyncSafetyOptions({
        mode: "default",
        preHash: false,
        forceEmpty: false,
        maxDeletedFiles: 100,
        maxDeletedPercent: 10,
      });
      return;
    }
    const cmd = getCommandConfig(value as SnapRaidCommand);
    setSelectedCommand(cmd ?? null);
    setOptions({});
    setSyncSafetyOptions({
      mode: "default",
      preHash: false,
      forceEmpty: false,
      maxDeletedFiles: 100,
      maxDeletedPercent: 10,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations"
        description="Execute SnapRAID commands"
        actions={
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <CommandSelectionCard
          selectedCommand={selectedCommand}
          isCommandRunning={isCommandRunning}
          onSelectCommand={handleSelectCommand}
        />

        <CommandOptionsCard
          selectedCommand={selectedCommand}
          options={options}
          syncSafetyOptions={syncSafetyOptions}
          isCommandRunning={isCommandRunning}
          currentCommand={currentCommand}
          onOptionsChange={setOptions}
          onSyncSafetyOptionsChange={setSyncSafetyOptions}
          onRun={handleRunCommand}
          onAbort={handleAbort}
        />
      </div>

      <CommandOutputCard
        output={output}
        isCommandRunning={isCommandRunning}
        currentCommand={currentCommand}
        onClear={clearOutput}
      />
    </div>
  );
}
