import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useWebSocket } from "@/hooks/use-websocket";
import {
  useExecuteCommandMutation,
  useAbortCommandMutation,
} from "@/store/api";
import { toast } from "@/hooks/use-toast";
import {
  Play,
  Square,
  RefreshCw,
  Shield,
  Search,
  Wrench,
  Thermometer,
  Terminal,
} from "lucide-react";
import type { SnapRaidCommand } from "@shared/types";

interface CommandConfig {
  name: string;
  command: SnapRaidCommand;
  description: string;
  icon: React.ReactNode;
  longRunning: boolean;
  options?: {
    name: string;
    key: string;
    type: "boolean" | "number" | "string";
    description: string;
    default?: unknown;
  }[];
}

const commands: CommandConfig[] = [
  {
    name: "Sync",
    command: "sync",
    description: "Update parity information for changed files",
    icon: <RefreshCw className="h-4 w-4" />,
    longRunning: true,
    options: [
      {
        name: "Pre-hash",
        key: "pre-hash",
        type: "boolean",
        description: "Verify data before syncing",
      },
      {
        name: "Force Empty",
        key: "force-empty",
        type: "boolean",
        description: "Allow sync with many deleted files",
      },
    ],
  },
  {
    name: "Scrub",
    command: "scrub",
    description: "Check data integrity and find silent errors",
    icon: <Search className="h-4 w-4" />,
    longRunning: true,
    options: [
      {
        name: "Plan (%)",
        key: "plan",
        type: "number",
        description: "Percentage of data to scrub",
        default: 8,
      },
      {
        name: "Older Than (days)",
        key: "older-than",
        type: "number",
        description: "Only scrub data older than N days",
        default: 10,
      },
    ],
  },
  {
    name: "Check",
    command: "check",
    description: "Verify data and parity without making changes",
    icon: <Shield className="h-4 w-4" />,
    longRunning: true,
    options: [
      {
        name: "Audit Only",
        key: "audit-only",
        type: "boolean",
        description: "Only check file hashes, skip parity",
      },
    ],
  },
  {
    name: "Status",
    command: "status",
    description: "Show current array status",
    icon: <Terminal className="h-4 w-4" />,
    longRunning: false,
  },
  {
    name: "Diff",
    command: "diff",
    description: "Show changes since last sync",
    icon: <Terminal className="h-4 w-4" />,
    longRunning: false,
  },
  {
    name: "SMART",
    command: "smart",
    description: "Show disk health information",
    icon: <Thermometer className="h-4 w-4" />,
    longRunning: false,
  },
  {
    name: "Fix",
    command: "fix",
    description: "Recover damaged files using parity",
    icon: <Wrench className="h-4 w-4" />,
    longRunning: true,
    options: [
      {
        name: "Filter",
        key: "filter",
        type: "string",
        description: "Filter files to fix (path or pattern)",
      },
      {
        name: "Missing Only",
        key: "filter-missing",
        type: "boolean",
        description: "Only restore deleted files",
      },
      {
        name: "Errors Only",
        key: "filter-error",
        type: "boolean",
        description: "Only fix files with errors",
      },
    ],
  },
];

export function Operations() {
  const [selectedCommand, setSelectedCommand] = useState<CommandConfig | null>(
    null
  );
  const [options, setOptions] = useState<Record<string, unknown>>({});

  const {
    isConnected,
    isCommandRunning,
    currentCommand,
    output,
    sendCommand,
    abort,
    clearOutput,
  } = useWebSocket({
    onComplete: (exitCode) => {
      toast({
        title: exitCode === 0 ? "Command completed" : "Command failed",
        description: `Exit code: ${exitCode}`,
        variant: exitCode === 0 ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Command error",
        description: error,
        variant: "destructive",
      });
    },
  });

  const [executeCommand] = useExecuteCommandMutation();
  const [abortCommand] = useAbortCommandMutation();

  const handleRunCommand = async (cmd: CommandConfig) => {
    const args: string[] = [];

    // Build args from options
    if (cmd.options) {
      for (const opt of cmd.options) {
        const value = options[opt.key];
        if (value !== undefined && value !== false && value !== "") {
          if (opt.type === "boolean") {
            args.push(`--${opt.key}`);
          } else {
            args.push(`-${opt.key.charAt(0)}`, String(value));
          }
        }
      }
    }

    clearOutput();

    if (cmd.longRunning) {
      // Use WebSocket for long-running commands
      sendCommand(cmd.command, args);
    } else {
      // Use REST API for quick commands
      try {
        await executeCommand({
          command: cmd.command,
          args,
        }).unwrap();
        toast({
          title: "Command completed",
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
        toast({
          title: "Command failed",
          description: message,
          variant: "destructive",
        });
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
        <Badge variant={isConnected ? "success" : "destructive"}>
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
            <div className="grid gap-2">
              {commands.map((cmd) => (
                <Button
                  key={cmd.command}
                  variant={
                    selectedCommand?.command === cmd.command
                      ? "default"
                      : "outline"
                  }
                  className="justify-start h-auto py-3"
                  onClick={() => {
                    setSelectedCommand(cmd);
                    setOptions({});
                  }}
                  disabled={isCommandRunning}
                >
                  <div className="flex items-center gap-3">
                    {cmd.icon}
                    <div className="text-left">
                      <div className="font-medium">{cmd.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {cmd.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Command Options */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedCommand ? selectedCommand.name : "Options"}
            </CardTitle>
            <CardDescription>
              {selectedCommand
                ? "Configure command options"
                : "Select a command to see options"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedCommand?.options && selectedCommand.options.length > 0 ? (
              <div className="space-y-4">
                {selectedCommand.options.map((opt) => (
                  <div key={opt.key} className="space-y-2">
                    {opt.type === "boolean" ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>{opt.name}</Label>
                          <p className="text-xs text-muted-foreground">
                            {opt.description}
                          </p>
                        </div>
                        <Switch
                          checked={!!options[opt.key]}
                          onCheckedChange={(checked) =>
                            setOptions({ ...options, [opt.key]: checked })
                          }
                        />
                      </div>
                    ) : (
                      <div>
                        <Label>{opt.name}</Label>
                        <p className="text-xs text-muted-foreground mb-1">
                          {opt.description}
                        </p>
                        <Input
                          type={opt.type === "number" ? "number" : "text"}
                          value={String(options[opt.key] ?? opt.default ?? "")}
                          onChange={(e) =>
                            setOptions({
                              ...options,
                              [opt.key]:
                                opt.type === "number"
                                  ? parseInt(e.target.value)
                                  : e.target.value,
                            })
                          }
                          placeholder={String(opt.default ?? "")}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedCommand
                  ? "No additional options available"
                  : "Select a command from the left"}
              </p>
            )}

            {selectedCommand && (
              <div className="mt-6 flex gap-2">
                {isCommandRunning &&
                currentCommand === selectedCommand.command ? (
                  <Button variant="destructive" onClick={handleAbort}>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleRunCommand(selectedCommand)}
                    disabled={isCommandRunning}
                  >
                    <Play className="h-4 w-4 mr-2" />
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
