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
import { useGetLogsQuery, useGetLogContentQuery } from "@/store/api";
import { User, Clock, Calendar, Download } from "lucide-react";
import type { LogFile } from "@shared/types";

export function Logs() {
  const { data: logs, isLoading } = useGetLogsQuery();
  const [selectedLog, setSelectedLog] = useState<LogFile | null>(null);

  const { data: logContent, isLoading: isLoadingContent } =
    useGetLogContentQuery(selectedLog?.filename || "", { skip: !selectedLog });

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
            <CardTitle>Log Files</CardTitle>
            <CardDescription>
              {logs?.length || 0} log files found
            </CardDescription>
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
    </div>
  );
}
