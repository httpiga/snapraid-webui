import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DiskStatusInfo } from "@shared/types"

interface DashboardDiskStatusCardProps {
  disks: DiskStatusInfo[]
  isLoading?: boolean
}

export function DashboardDiskStatusCard({
  disks,
  isLoading,
}: DashboardDiskStatusCardProps) {
  if (!isLoading && disks.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disk Status</CardTitle>
        <CardDescription>Individual disk statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading
            ? [1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex-1">
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
            : disks.map((disk) => (
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
                    {disk.usedGB.toFixed(1)} /{" "}
                    {(disk.usedGB + disk.freeGB).toFixed(1)} GB
                  </div>
                </div>
              ))}
        </div>
      </CardContent>
    </Card>
  )
}
