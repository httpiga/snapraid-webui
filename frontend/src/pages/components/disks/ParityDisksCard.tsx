import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FolderOpen, Plus, Shield, Trash2 } from "lucide-react"
import { FileSystemDialog } from "@/components/FileSystemDialog"
import { useState } from "react"

interface ParityDisksCardProps {
  parity: string[]
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, value: string) => void
}

export function ParityDisksCard({
  parity,
  onAdd,
  onRemove,
  onUpdate,
}: ParityDisksCardProps) {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false)
  const [browserTarget, setBrowserTarget] = useState<number | null>(null)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Parity Disks
            </CardTitle>
            <CardDescription>
              Parity files store redundancy data for recovery
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {parity.map((path, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={index === 0 ? "parity" : `${index + 1}-parity`}
                disabled={true}
                className="w-24"
              />

              <Input
                value={path}
                onChange={(e) => onUpdate(index, e.target.value)}
                placeholder="/mnt/parity/snapraid.parity"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setBrowserTarget(index)
                  setIsBrowserOpen(true)
                }}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {parity.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No parity disks configured. Add at least one parity disk.
            </p>
          )}
        </div>
        <Button onClick={onAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Parity
        </Button>
      </CardContent>
      <FileSystemDialog
        open={isBrowserOpen}
        onOpenChange={setIsBrowserOpen}
        title="Select disk folder"
        description="Choose the folder that contains the disk data."
        onSelect={(path) => {
          if (browserTarget !== null) {
            onUpdate(browserTarget, path)
          }
        }}
      />
    </Card>
  )
}
