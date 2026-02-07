import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface RawConfigEditorProps {
  value: string
  onChange: (value: string) => void
}

export function RawConfigEditor({ value, onChange }: RawConfigEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Raw Configuration</CardTitle>
        <CardDescription>Edit the snapraid.conf file directly</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] w-full rounded border">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full min-h-[500px] p-4 font-mono text-sm bg-background resize-none focus:outline-none"
            spellCheck={false}
          />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
