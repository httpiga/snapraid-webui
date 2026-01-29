import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { CommandConfig } from "@/lib/command-config";

interface CommandOptionsProps {
  commandConfig: CommandConfig | null;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

/**
 * Reusable options form for SnapRAID commands (sync, scrub, check, fix, etc.).
 * Renders the option fields; wrap in a Card or section as needed.
 */
export function CommandOptions({
  commandConfig,
  value,
  onChange,
}: CommandOptionsProps) {
  if (!commandConfig) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a command to see options
      </p>
    );
  }

  if (!commandConfig.options || commandConfig.options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No additional options available
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {commandConfig.options.map((opt) => (
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
                checked={!!value[opt.key]}
                onCheckedChange={(checked) =>
                  onChange({ ...value, [opt.key]: checked })
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
                value={String(value[opt.key] ?? opt.default ?? "")}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [opt.key]:
                      opt.type === "number"
                        ? parseInt(e.target.value, 10)
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
  );
}
