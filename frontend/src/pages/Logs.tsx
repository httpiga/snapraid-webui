import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CommandBadge } from "@/components/ui/command-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useGetLogsQuery,
  useGetLogContentQuery,
  useDeleteAllLogsMutation,
  useDeleteLogsOlderThanMutation,
} from "@/store/api";
import {
  User,
  Clock,
  Calendar,
  Download,
  Trash2,
  ChevronDown,
} from "lucide-react";
import type { LogFile } from "@shared/types";
import { toast } from "sonner";

type DeleteConfirmMode = "all" | "olderThan" | null;

export function Logs() {
  const { data: logs, isLoading } = useGetLogsQuery();
  const [selectedLog, setSelectedLog] = useState<LogFile | null>(null);
  const [deleteConfirmMode, setDeleteConfirmMode] =
    useState<DeleteConfirmMode>(null);

  const [deleteAllLogs, { isLoading: isDeletingAll }] =
    useDeleteAllLogsMutation();
  const [deleteLogsOlderThan, { isLoading: isDeletingOlderThan }] =
    useDeleteLogsOlderThanMutation();

  const { data: logContent, isLoading: isLoadingContent } =
    useGetLogContentQuery(selectedLog?.filename || "", { skip: !selectedLog });

  const handleConfirmDelete = async () => {
    if (!deleteConfirmMode) return;
    try {
      if (deleteConfirmMode === "all") {
        const result = await deleteAllLogs().unwrap();
        toast.success(`Deleted ${result.deleted} log file(s)`);
      } else {
        const result = await deleteLogsOlderThan(30).unwrap();
        toast.success(
          `Deleted ${result.deleted} log file(s) older than 30 days`
        );
      }
      setDeleteConfirmMode(null);
      setSelectedLog(null);
    } catch {
      toast.error("Failed to delete logs");
    }
  };

  const isDeleting = isDeletingAll || isDeletingOlderThan;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
        <p className="text-muted-foreground">
          View operation history and command logs
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Log List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Log Files</CardTitle>
                <CardDescription>
                  {logs?.length || 0} log files found
                </CardDescription>
              </div>
              {(logs?.length ?? 0) > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isDeleting}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete logs
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirmMode("olderThan")}
                    >
                      Delete logs older than 30 days
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirmMode("all")}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete all logs
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <button
                      key={log.filename}
                      onClick={() => setSelectedLog(log)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedLog?.filename === log.filename
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {log.scheduled ? (
                          <Clock
                            className="h-4 w-4 text-primary"
                            aria-label="Scheduled operation"
                          />
                        ) : (
                          <User
                            className="h-4 w-4 text-muted-foreground"
                            aria-label="Manual operation"
                          />
                        )}
                        <CommandBadge command={log.command} />
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {formatDate(log.timestamp)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatSize(log.size)}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No log files found
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Log Content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedLog ? selectedLog.filename : "Log Content"}
                </CardTitle>
                <CardDescription>
                  {selectedLog ? (
                    <>
                      {selectedLog.command} —{" "}
                      {formatDate(selectedLog.timestamp)}
                      {" · "}
                      {selectedLog.scheduled
                        ? "Scheduled operation"
                        : "Manual operation"}
                    </>
                  ) : (
                    "Select a log file to view its content"
                  )}
                </CardDescription>
              </div>
              {selectedLog && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`/api/logs/${selectedLog.filename}`}
                      download={selectedLog.filename}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] w-full rounded border bg-black">
              <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre-wrap">
                {isLoadingContent
                  ? "Loading..."
                  : logContent
                  ? logContent
                  : selectedLog
                  ? "Failed to load log content"
                  : "Select a log file from the list to view its content"}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={deleteConfirmMode !== null}
        onOpenChange={(open) => !open && setDeleteConfirmMode(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmMode === "all"
                ? "Delete all logs?"
                : "Delete logs older than 30 days?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmMode === "all"
                ? "This will permanently remove all log files. This action cannot be undone."
                : "This will permanently remove log files older than 30 days. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
