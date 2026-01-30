import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileBraces, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { FileSystemDialog } from "@/components/FileSystemDialog";

interface ContentFilesCardProps {
  content: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
}

export function ContentFilesCard({
  content,
  onAdd,
  onRemove,
  onUpdate,
}: ContentFilesCardProps) {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserTarget, setBrowserTarget] = useState<number | null>(null);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileBraces className="h-5 w-5" />
              Content Files
            </CardTitle>
            <CardDescription>
              Content files store the list of files and their checksums
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {content.map((path, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={path}
                onChange={(e) => onUpdate(index, e.target.value)}
                placeholder="/mnt/disk1/snapraid.content"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setBrowserTarget(index);
                  setIsBrowserOpen(true);
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
          {content.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No content files configured. Add at least two for redundancy.
            </p>
          )}
        </div>
        <Button onClick={onAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Content
        </Button>
      </CardContent>
      <FileSystemDialog
        open={isBrowserOpen}
        onOpenChange={setIsBrowserOpen}
        title="Select disk folder"
        description="Choose the folder that contains the disk data."
        onSelect={(path) => {
          if (browserTarget) {
            onUpdate(browserTarget, path);
          }
        }}
      />
    </Card>
  );
}
