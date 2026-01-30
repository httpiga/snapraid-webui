import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HardDrive, Plus, Trash2 } from "lucide-react";

interface DataDisksCardProps {
  data: Record<string, string>;
  onAdd: () => void;
  onRemove: (name: string) => void;
  onUpdate: (oldName: string, newName: string, path: string) => void;
}

export function DataDisksCard({
  data,
  onAdd,
  onRemove,
  onUpdate,
}: DataDisksCardProps) {
  const entries = Object.entries(data);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Data Disks
            </CardTitle>
            <CardDescription>
              Data disks contain the files you want to protect
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {entries.map(([name, path]) => (
            <div key={name} className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => onUpdate(name, e.target.value, path)}
                placeholder="d1"
                className="w-24"
              />
              <Input
                value={path}
                onChange={(e) => onUpdate(name, name, e.target.value)}
                placeholder="/mnt/disk1/"
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => onRemove(name)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No data disks configured. Add at least one data disk.
            </p>
          )}
        </div>
        <Button onClick={onAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Disk
        </Button>
      </CardContent>
    </Card>
  );
}
