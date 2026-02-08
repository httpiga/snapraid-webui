import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { CommandBadge } from "@/components/ui/command-badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, ChevronDown, Clock, FileText, Trash2, User } from "lucide-react"
import type { LogFile } from "@shared/types"

interface LogListCardProps {
  logs: LogFile[]
  selectedLog: LogFile | null
  isDeleting: boolean
  onSelect: (log: LogFile) => void
  onDeleteAll: () => void
  onDeleteOlder: () => void
  formatDate: (dateString: string) => string
  formatSize: (bytes: number) => string
}

export function LogListCard({
  logs,
  selectedLog,
  isDeleting,
  onSelect,
  onDeleteAll,
  onDeleteOlder,
  formatDate,
  formatSize,
}: LogListCardProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Log Files</CardTitle>
            <CardDescription>{logs.length} log files found</CardDescription>
          </div>
          {logs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete logs
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDeleteOlder}>
                  Delete logs older than 30 days
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDeleteAll}
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
            {logs.length > 0 ? (
              logs.map((log) => (
                <button
                  key={log.filename}
                  onClick={() => onSelect(log)}
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
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText className="h-4 w-4" />
                  </EmptyMedia>
                  <EmptyTitle>No log files found</EmptyTitle>
                  <EmptyDescription>
                    Log files from sync and scrub operations will appear here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
