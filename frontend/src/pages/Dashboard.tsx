import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGetStatusQuery } from "@/store/api";
import { CheckCircle, AlertCircle, HardDrive, FileText } from "lucide-react";

export function Dashboard() {
  const {
    data: status,
    isLoading,
    error,
  } = useGetStatusQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

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
