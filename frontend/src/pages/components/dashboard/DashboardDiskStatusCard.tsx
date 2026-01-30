import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DiskStatusInfo } from "@shared/types";

interface DashboardDiskStatusCardProps {
  disks: DiskStatusInfo[];
}

export function DashboardDiskStatusCard({
  disks,
}: DashboardDiskStatusCardProps) {
  if (disks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disk Status</CardTitle>
        <CardDescription>Individual disk statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {disks.map((disk) => (
            <div key={disk.name} className="flex items-center gap-4">
              <div className="w-24 font-medium">{disk.name}</div>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${disk.usePercent}%` }}
                  />
                </div>
              </div>
              <div className="w-32 text-right text-sm text-muted-foreground">
                {disk.usedGB.toFixed(1)} / {(disk.usedGB + disk.freeGB).toFixed(1)} GB
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
