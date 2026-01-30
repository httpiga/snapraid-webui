import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CommandBadge } from "@/components/ui/command-badge";
import { Calendar, Clock, Edit, Trash2 } from "lucide-react";
import type { Schedule } from "@shared/types";

interface ScheduleListProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (schedule: Schedule) => void;
  formatDate: (dateString?: string) => string;
}

export function ScheduleList({
  schedules,
  onEdit,
  onDelete,
  onToggleEnabled,
  formatDate,
}: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No schedules configured. Create one to automate SnapRAID operations.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {schedules.map((schedule) => (
        <Card key={schedule.id}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Switch
                  checked={schedule.enabled}
                  onCheckedChange={() => onToggleEnabled(schedule)}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{schedule.name}</h3>
                    <Badge variant={schedule.enabled ? "default" : "secondary"}>
                      {schedule.enabled ? "Active" : "Disabled"}
                    </Badge>
                    <CommandBadge command={schedule.command} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {schedule.cronExpression}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Last: {formatDate(schedule.lastRun)}
                    </div>
                    <div>Next: {formatDate(schedule.nextRun)}</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(schedule)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(schedule.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
