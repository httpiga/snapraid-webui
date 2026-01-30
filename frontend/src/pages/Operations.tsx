import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommandSelect } from "@/components/ui/command-select";
import { CommandOptions } from "@/components/CommandOptions";
import { useWebSocket } from "@/hooks/use-websocket";
import {
  api,
  useExecuteCommandMutation,
  useAbortCommandMutation,
} from "@/store/api";
import { toast } from "sonner";
import { Play, Square, Terminal } from "lucide-react";
import {
  getCommandConfig,
  optionsToArgs,
  type CommandConfig,
} from "@/lib/command-config";
import type { SnapRaidCommand } from "@shared/types";

export function Operations() {
  const dispatch = useDispatch();
  const [selectedCommand, setSelectedCommand] = useState<CommandConfig | null>(
    null
  );
  const [options, setOptions] = useState<Record<string, unknown>>({});

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
    const args = optionsToArgs(cmd, options);
    clearOutput();

    if (cmd.longRunning) {
      // Use WebSocket for long-running commands
      sendCommand(cmd.command, args);
    } else {
      // Use REST API for quick commands
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
        const message =
          error &&
          typeof error === "object" &&
          "error" in error &&
          typeof (error as { error: unknown }).error === "string"
            ? (error as { error: string }).error
            : String(error);
        toast.error("Command failed", { description: message });
      }
    }
  };

  const handleAbort = async () => {
    abort();
    await abortCommand();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operations</h1>
          <p className="text-muted-foreground">Execute SnapRAID commands</p>
        </div>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Command Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Commands</CardTitle>
            <CardDescription>Select a command to execute</CardDescription>
          </CardHeader>
          <CardContent>
            <CommandSelect
              value={selectedCommand?.command ?? ""}
              onValueChange={(value) => {
                if (!value) {
                  setSelectedCommand(null);
                  setOptions({});
                  return;
                }
                const cmd = getCommandConfig(value as SnapRaidCommand);
                setSelectedCommand(cmd ?? null);
                setOptions({});
              }}
              disabled={isCommandRunning}
              placeholder="Select command"
              className="min-w-[280px]"
            />
          </CardContent>
        </Card>

        {/* Command Options */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedCommand ? selectedCommand.name : "Options"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CommandOptions
              commandConfig={selectedCommand}
              value={options}
              onChange={setOptions}
            />

            {selectedCommand && (
              <div className="mt-6 flex gap-2">
                {isCommandRunning &&
                currentCommand === selectedCommand.command ? (
                  <Button variant="destructive" onClick={handleAbort}>
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleRunCommand(selectedCommand)}
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
      </div>

      {/* Output Console */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Output
              </CardTitle>
              <CardDescription>
                {isCommandRunning
                  ? `Running: ${currentCommand}...`
                  : "Command output will appear here"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={clearOutput}>
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded border bg-black">
            <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre-wrap">
              {output || "No output yet. Run a command to see results."}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
