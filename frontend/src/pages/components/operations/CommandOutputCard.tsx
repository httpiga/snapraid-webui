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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Terminal } from "lucide-react"

interface CommandOutputCardProps {
  output: string
  isCommandRunning: boolean
  currentCommand: string | null
  onClear: () => void
}

export function CommandOutputCard({
  output,
  isCommandRunning,
  currentCommand,
  onClear,
}: CommandOutputCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Output
            </CardTitle>
            <CardDescription>
              {isCommandRunning
                ? `Running: ${currentCommand}...`
                : "Command output will appear here"}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {output ? (
          <ScrollArea className="h-[400px] w-full rounded border bg-black">
            <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre-wrap">
              {output}
            </pre>
          </ScrollArea>
        ) : (
          <Empty className="h-[400px] border rounded border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Terminal className="h-4 w-4" />
              </EmptyMedia>
              <EmptyTitle>No output yet</EmptyTitle>
              <EmptyDescription>
                Run a command to see results here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
