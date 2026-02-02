import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, FileText, HardDrive } from "lucide-react";
import type { SnapRaidStatus } from "@shared/types";

interface DashboardStatusCardsProps {
  status?: SnapRaidStatus;
}

export function DashboardStatusCards({ status }: DashboardStatusCardsProps) {
  return (
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
            {status?.newFiles || 0} new, {status?.modifiedFiles || 0} modified,{" "}
            {status?.deletedFiles || 0} deleted
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
            {status?.totalUsedGB ? `${status.totalUsedGB.toFixed(1)} GB` : "—"}
          </div>
          <p className="text-xs text-muted-foreground">
            {status?.totalFreeGB
              ? `${status.totalFreeGB.toFixed(1)} GB free`
              : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
