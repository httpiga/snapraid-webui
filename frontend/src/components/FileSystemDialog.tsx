import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetFileSystemEntriesQuery } from "@/store/api";
import { cn } from "@/lib/utils";
import { Folder, File, ArrowUp, RefreshCw } from "lucide-react";

interface FileSystemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  title?: string;
  description?: string;
  initialPath?: string;
}

export function FileSystemDialog({
  open,
  onOpenChange,
  onSelect,
  title = "Select folder",
  description = "Browse the container filesystem to choose a folder.",
  initialPath,
}: FileSystemDialogProps) {
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const { data, isFetching, refetch } = useGetFileSystemEntriesQuery(
    { path: currentPath },
    { skip: !open }
  );

  useEffect(() => {
    if (open) {
      setCurrentPath(initialPath);
    } else {
      setSelectedPath(null);
    }
  }, [open, initialPath]);

  useEffect(() => {
    if (data?.path) {
      setSelectedPath(data.path);
    }
  }, [data?.path]);

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);

  const handleSelect = () => {
    if (!selectedPath) return;
    onSelect(selectedPath);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => data?.parentPath && setCurrentPath(data.parentPath)}
              disabled={!data?.parentPath}
            >
              <ArrowUp className="h-4 w-4 mr-1" />
              Up
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <div className="text-sm text-muted-foreground truncate">
              {data?.path ?? "Loading..."}
            </div>
          </div>

          <div className="rounded-lg border">
            <ScrollArea className="h-[320px]">
              {entries.length === 0 && !isFetching ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  This folder is empty.
                </div>
              ) : (
                <div className="divide-y">
                  {entries.map((entry) => (
                    <button
                      key={entry.path}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm transition",
                        "hover:bg-muted/40",
                        selectedPath === entry.path && "bg-muted/60"
                      )}
                      onClick={() => {
                        if (entry.isDirectory) {
                          setSelectedPath(entry.path);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {entry.isDirectory ? (
                          <Folder className="h-4 w-4 text-sky-500" />
                        ) : (
                          <File className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{entry.name}</span>
                      </div>
                      {entry.isDirectory ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCurrentPath(entry.path);
                          }}
                        >
                          Open
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {entry.size !== undefined ? `${entry.size} B` : "File"}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

        </div>

        <DialogFooter showCloseButton={false}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSelect} disabled={!selectedPath}>
            Select folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
