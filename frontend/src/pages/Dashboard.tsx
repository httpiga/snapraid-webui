import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGetStatusQuery, useGetSchedulesQuery } from "@/store/api";
import {
  CheckCircle,
  AlertCircle,
  HardDrive,
  FileText,
  Calendar,
} from "lucide-react";
import type { Schedule } from "@shared/types";

function formatNextRun(isoString: string | undefined): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (dateOnly.getTime() === today.getTime()) {
    return `Today at ${timeStr}`;
  }
  if (dateOnly.getTime() === tomorrow.getTime()) {
    return `Tomorrow at ${timeStr}`;
  }
  return (
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }) + ` at ${timeStr}`
  );
}

export function Dashboard() {
  const {
    data: status,
    isLoading,
    error,
  } = useGetStatusQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: schedules = [] } = useGetSchedulesQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading status...</div>
      </div>
    );
  }

  if (error) {
    const message =
      error &&
      typeof error === "object" &&
      "data" in error &&
      error.data &&
      typeof error.data === "object" &&
      "error" in error.data
        ? (error.data as { error: string }).error
        : "Failed to load status. Is the backend running?";
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">{message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your SnapRAID array status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parity Status</CardTitle>
            {status?.parityUpToDate ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.parityUpToDate ? "Up to Date" : "Sync Required"}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.newFiles || 0} new, {status?.modifiedFiles || 0}{" "}
              modified, {status?.deletedFiles || 0} deleted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Array Health</CardTitle>
            {status?.hasErrors ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : status?.hasWarnings ? (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.hasErrors
                ? "Errors Found"
                : status?.hasWarnings
                ? "Warnings"
                : "Healthy"}
            </div>
            <p className="text-xs text-muted-foreground">
              Scrub coverage:{" "}
              {status?.scrubPercentage !== undefined
                ? `${status.scrubPercentage}%`
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.totalFiles?.toLocaleString() || "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.fragmentedFiles || 0} fragmented
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.totalUsedGB
                ? `${status.totalUsedGB.toFixed(1)} GB`
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.totalFreeGB
                ? `${status.totalFreeGB.toFixed(1)} GB free`
                : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Next scheduled operations
            </CardTitle>
            <CardDescription>
              Upcoming runs from your schedules (enabled only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const enabled = (schedules as Schedule[]).filter(
                (s) => s.enabled
              );
              const sorted = [...enabled].sort((a, b) => {
                const aTime = a.nextRun
                  ? new Date(a.nextRun).getTime()
                  : Infinity;
                const bTime = b.nextRun
                  ? new Date(b.nextRun).getTime()
                  : Infinity;
                return aTime - bTime;
              });
              if (sorted.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    No upcoming scheduled operations. Add schedules from the
                    Schedules page.
                  </p>
                );
              }
              return (
                <ul className="divide-y divide-border">
                  {sorted.slice(0, 10).map((schedule) => (
                    <li
                      key={schedule.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="font-medium">{schedule.name}</div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="capitalize">{schedule.command}</span>
                        <span>{formatNextRun(schedule.nextRun)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {status?.disks && status.disks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Disk Status</CardTitle>
            <CardDescription>Individual disk statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status.disks.map((disk) => (
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
      )}
    </div>
  );
}
