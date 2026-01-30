import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMAND_ICONS } from "@/lib/commands";
import {
  commands as allCommands,
  type CommandConfig,
} from "@/lib/command-config";
import type { SnapRaidCommand } from "@shared/types";

export interface CommandSelectProps {
  /** The selected command value (or empty string for none). */
  value: SnapRaidCommand | "";
  /** Callback when selection changes. */
  onValueChange: (value: SnapRaidCommand | "") => void;
  /** Optional: list of commands to show. Defaults to all commands. */
  commands?: CommandConfig[];
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** Placeholder text when no command is selected. */
  placeholder?: string;
  /** Optional className for the SelectTrigger. */
  className?: string;
}

/**
 * Reusable command select with icon, name, and description for each option.
 * Shows icon + name in the trigger; icon + name + description in the dropdown.
 */
export function CommandSelect({
  value,
  onValueChange,
  commands = allCommands,
  disabled,
  placeholder = "Select command",
  className,
}: CommandSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={`w-full h-auto py-3 [&_[data-select-trigger-hide]]:hidden ${
          className ?? ""
        }`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {commands.map((cmd) => {
          const CommandIcon = COMMAND_ICONS[cmd.command];
          return (
            <SelectItem key={cmd.command} value={cmd.command}>
              <div className="flex items-center gap-2 min-w-0 w-full">
                <CommandIcon className="h-4 w-4 shrink-0" />
                <span className="font-medium shrink-0">{cmd.name}</span>
                <span
                  className="text-xs text-muted-foreground truncate flex-1 min-w-0"
                  data-select-trigger-hide
                >
                  — {cmd.description}
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
