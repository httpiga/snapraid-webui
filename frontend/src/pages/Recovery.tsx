import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWebSocket } from "@/hooks/use-websocket";
import { useGetConfigQuery } from "@/store/api";
import { toast } from "sonner";
import {
  RotateCcw,
  Bug,
  AlertTriangle,
  Play,
  Square,
  Trash,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldDescription } from "@/components/ui/field";

export function Recovery() {
  const [filterPath, setFilterPath] = useState("");
  const [filterMissing, setFilterMissing] = useState(true);
  const [filterError, setFilterError] = useState(false);
  const [filterDisk, setFilterDisk] = useState("");

  const { data: config } = useGetConfigQuery();
  const diskNames = config?.data ? Object.keys(config.data).sort() : [];

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
      if (exitCode === 0) {
        toast.success("Recovery completed", {
          description: `Exit code: ${exitCode}`,
        });
      } else {
        toast.error("Recovery failed", {
          description: `Exit code: ${exitCode}`,
        });
      }
    },
    onError: (error) => {
      toast.error("Recovery error", { description: error });
    },
  });

  const handleStartRecovery = () => {
    const args: string[] = [];

    if (filterPath) {
      args.push("-f", filterPath);
    }
    if (filterMissing) {
      args.push("-m");
    }
    if (filterError) {
      args.push("-e");
    }
    if (filterDisk) {
      args.push("-d", filterDisk);
    }

    clearOutput();
    sendCommand("fix", args);
  };

  const handleAbort = () => {
    abort();
  };

  const isRecovering = isCommandRunning && currentCommand === "fix";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">File Recovery</h1>
        <p className="text-muted-foreground">
          Restore deleted or corrupted files using parity data
        </p>
      </div>
      <div>
        {/* Warning Card */}
        <Alert
          className="bg-red-500/10 border-red-500 p-4"
          variant="destructive"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle />
            <AlertTitle>Danger Zone</AlertTitle>
          </div>
          <AlertDescription className="text-sm text-muted-foreground">
            File recovery will restore files to their state at the last sync.{" "}
            <br />
            Any changes made to files after the last sync will be overwritten.{" "}
            <br />
            Make sure you have a backup of any important changes.
          </AlertDescription>
        </Alert>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recovery Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recovery Options
            </CardTitle>
            <CardDescription>Configure which files to recover</CardDescription>
          </CardHeader>
          {/* Quick Actions */}
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
                  onClick={() => {
                    setFilterPath("");
                    setFilterMissing(true);
                    setFilterError(false);
                    setFilterDisk("");
                  }}
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Recover All Deleted Files
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setFilterPath("");
                    setFilterMissing(false);
                    setFilterError(true);
                    setFilterDisk("");
                  }}
                >
                  <Bug className="h-4 w-4 mr-1" />
                  Fix All Error Files
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start "
                  onClick={() => {
                    setFilterPath("");
                    setFilterMissing(true);
                    setFilterError(true);
                    setFilterDisk("");
                  }}
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
                  characters, <code className="rounded bg-muted px-1">?</code>{" "}
                  matches one character. Leave empty to recover all files
                  matching other filters.
                </p>
              </FieldDescription>
              <Input
                id="filterPath"
                value={filterPath}
                onChange={(e) => setFilterPath(e.target.value)}
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
                onValueChange={(v) => setFilterDisk(v === "all" ? "" : v)}
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
                  <Label htmlFor="filterMissing">
                    Recover Missing Files Only
                  </Label>
                  <FieldDescription className="text-xs text-muted-foreground">
                    Only restore files that have been deleted
                  </FieldDescription>
                </div>
                <Switch
                  id="filterMissing"
                  checked={filterMissing}
                  onCheckedChange={setFilterMissing}
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
                  onCheckedChange={setFilterError}
                />
              </div>
            </div>

            <div className="pt-4">
              {isRecovering ? (
                <Button
                  variant="destructive"
                  onClick={handleAbort}
                  className="w-full"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop Recovery
                </Button>
              ) : (
                <Button
                  onClick={handleStartRecovery}
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

        {/* Recovery Output */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recovery Output</CardTitle>
                <CardDescription>
                  {isRecovering ? (
                    <span className="flex items-center gap-2">
                      <Badge variant="default" className="animate-pulse">
                        Running
                      </Badge>
                      Recovery in progress...
                    </span>
                  ) : (
                    "Recovery progress will appear here"
                  )}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={clearOutput}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded border bg-black">
              <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre-wrap">
                {output || "No output yet. Start a recovery to see progress."}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
