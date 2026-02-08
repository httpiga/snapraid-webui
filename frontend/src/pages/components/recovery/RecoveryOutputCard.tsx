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
import { Badge } from "@/components/ui/badge"
import { RotateCcw } from "lucide-react"

interface RecoveryOutputCardProps {
  isRecovering: boolean
  output: string
  onClear: () => void
}

export function RecoveryOutputCard({
  isRecovering,
  output,
  onClear,
}: RecoveryOutputCardProps) {
  return (
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
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {output ? (
          <ScrollArea className="h-[300px] w-full rounded border bg-black">
            <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre-wrap">
              {output}
            </pre>
          </ScrollArea>
        ) : (
          <Empty className="h-[300px] border rounded border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RotateCcw className="h-4 w-4" />
              </EmptyMedia>
              <EmptyTitle>No output yet</EmptyTitle>
              <EmptyDescription>
                Start a recovery to see progress here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
