import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CommandSelect } from "@/components/ui/command-select";
import type { CommandConfig } from "@/lib/command-config";
import type { SnapRaidCommand } from "@shared/types";

interface CommandSelectionCardProps {
  selectedCommand: CommandConfig | null;
  isCommandRunning: boolean;
  onSelectCommand: (command: SnapRaidCommand | "") => void;
}

export function CommandSelectionCard({
  selectedCommand,
  isCommandRunning,
  onSelectCommand,
}: CommandSelectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commands</CardTitle>
        <CardDescription>Select a command to execute</CardDescription>
      </CardHeader>
      <CardContent>
        <CommandSelect
          value={selectedCommand?.command ?? ""}
  onValueChange={(value) =>
    onSelectCommand(value as SnapRaidCommand | \"\")
  }
          disabled={isCommandRunning}
          placeholder="Select command"
          className="min-w-[280px]"
        />
      </CardContent>
    </Card>
  );
}
