import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface RecoveryOutputCardProps {
  isRecovering: boolean;
  output: string;
  onClear: () => void;
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
        <ScrollArea className="h-[300px] w-full rounded border bg-black">
          <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre-wrap">
            {output || "No output yet. Start a recovery to see progress."}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
