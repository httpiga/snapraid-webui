import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download } from "lucide-react"
import type { LogFile } from "@shared/types"

interface LogContentCardProps {
  selectedLog: LogFile | null
  logContent?: string
  isLoadingContent: boolean
  formatDate: (dateString: string) => string
}

export function LogContentCard({
  selectedLog,
  logContent,
  isLoadingContent,
  formatDate,
}: LogContentCardProps) {
  return (
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
                  {selectedLog.command} — {formatDate(selectedLog.timestamp)}
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
  )
}
