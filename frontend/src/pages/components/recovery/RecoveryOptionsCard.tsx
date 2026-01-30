import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldDescription } from "@/components/ui/field";
import { Bug, Play, RotateCcw, Square, Trash } from "lucide-react";

interface RecoveryOptionsCardProps {
  filterPath: string;
  filterMissing: boolean;
  filterError: boolean;
  filterDisk: string;
  diskNames: string[];
  isRecovering: boolean;
  isConnected: boolean;
  onFilterPathChange: (value: string) => void;
  onFilterMissingChange: (value: boolean) => void;
  onFilterErrorChange: (value: boolean) => void;
  onFilterDiskChange: (value: string) => void;
  onRecoverDeleted: () => void;
  onFixErrors: () => void;
  onFullRecovery: () => void;
  onStartRecovery: () => void;
  onStopRecovery: () => void;
}

export function RecoveryOptionsCard({
  filterPath,
  filterMissing,
  filterError,
  filterDisk,
  diskNames,
  isRecovering,
  isConnected,
  onFilterPathChange,
  onFilterMissingChange,
  onFilterErrorChange,
  onFilterDiskChange,
  onRecoverDeleted,
  onFixErrors,
  onFullRecovery,
  onStartRecovery,
  onStopRecovery,
}: RecoveryOptionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Recovery Options
        </CardTitle>
        <CardDescription>Configure which files to recover</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card size="sm" className="bg-sky-300/10 border-sky-500">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common recovery scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={onRecoverDeleted}
            >
              <Trash className="h-4 w-4 mr-1" />
              Recover All Deleted Files
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={onFixErrors}
            >
              <Bug className="h-4 w-4 mr-1" />
              Fix All Error Files
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={onFullRecovery}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Full Recovery (Missing + Errors)
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="filterPath">File or Directory Filter</Label>
          <FieldDescription>
            <p className="text-xs text-muted-foreground">
              Limit recovery to specific paths. Supports wildcards:{" "}
              <code className="rounded bg-muted px-1">*</code> matches any
              characters, <code className="rounded bg-muted px-1">?</code> matches
              one character. Leave empty to recover all files matching other
              filters.
            </p>
          </FieldDescription>
          <Input
            id="filterPath"
            value={filterPath}
            onChange={(e) => onFilterPathChange(e.target.value)}
            placeholder="e.g. /path/to/file or /directory/"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="filterDisk">Disk Filter</Label>
          <FieldDescription className="text-xs text-muted-foreground">
            Only recover files from a specific disk
          </FieldDescription>
          <Select
            value={filterDisk || "all"}
            onValueChange={(value) => onFilterDiskChange(value === "all" ? "" : value)}
          >
            <SelectTrigger id="filterDisk">
              <SelectValue placeholder="All disks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All disks</SelectItem>
              {diskNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="filterMissing">Recover Missing Files Only</Label>
              <FieldDescription className="text-xs text-muted-foreground">
                Only restore files that have been deleted
              </FieldDescription>
            </div>
            <Switch
              id="filterMissing"
              checked={filterMissing}
              onCheckedChange={onFilterMissingChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="filterError">Recover Error Files Only</Label>
              <FieldDescription className="text-xs text-muted-foreground">
                Only restore files marked with errors
              </FieldDescription>
            </div>
            <Switch
              id="filterError"
              checked={filterError}
              onCheckedChange={onFilterErrorChange}
            />
          </div>
        </div>

        <div className="pt-4">
          {isRecovering ? (
            <Button
              variant="destructive"
              onClick={onStopRecovery}
              className="w-full"
            >
              <Square className="h-4 w-4 mr-1" />
              Stop Recovery
            </Button>
          ) : (
            <Button
              onClick={onStartRecovery}
              className="w-full"
              disabled={!isConnected}
            >
              <Play className="h-4 w-4 mr-1" />
              Start Recovery
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
