import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CommandOptions } from "@/components/CommandOptions";
import { Play, Square } from "lucide-react";
import type { CommandConfig } from "@/lib/command-config";

interface CommandOptionsCardProps {
  selectedCommand: CommandConfig | null;
  options: Record<string, unknown>;
  isCommandRunning: boolean;
  currentCommand: string | null;
  onOptionsChange: (value: Record<string, unknown>) => void;
  onRun: (command: CommandConfig) => void;
  onAbort: () => void;
}

export function CommandOptionsCard({
  selectedCommand,
  options,
  isCommandRunning,
  currentCommand,
  onOptionsChange,
  onRun,
  onAbort,
}: CommandOptionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{selectedCommand ? selectedCommand.name : "Options"}</CardTitle>
      </CardHeader>
      <CardContent>
        <CommandOptions
          commandConfig={selectedCommand}
          value={options}
          onChange={onOptionsChange}
        />

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
  );
}
