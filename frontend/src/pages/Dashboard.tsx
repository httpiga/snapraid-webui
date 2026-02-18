import { useGetStatusQuery, useGetSchedulesQuery } from "@/store/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { PageHeader } from "@/pages/components/PageHeader"
import { DashboardStatusCards } from "@/pages/components/dashboard/DashboardStatusCards"
import { DashboardScheduleCard } from "@/pages/components/dashboard/DashboardScheduleCard"
import { DashboardDiskStatusCard } from "@/pages/components/dashboard/DashboardDiskStatusCard"

export function Dashboard() {
  const {
    data: status,
    isLoading: isStatusLoading,
    error,
  } = useGetStatusQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })
  const { data: schedules = [], isLoading: isSchedulesLoading } =
    useGetSchedulesQuery()

  if (error && !isStatusLoading) {
    const message =
      getApiErrorMessage(error) ||
      "Failed to load status. Is the backend running?"
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">{message}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your SnapRAID array status"
      />

      <DashboardStatusCards status={status} isLoading={isStatusLoading} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardScheduleCard
          schedules={schedules}
          isLoading={isSchedulesLoading}
        />
      </div>

      {isStatusLoading || (status?.disks && status.disks.length > 0) ? (
        <DashboardDiskStatusCard
          disks={status?.disks ?? []}
          isLoading={isStatusLoading}
        />
      ) : null}
    </div>
  )
}
