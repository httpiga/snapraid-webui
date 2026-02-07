import { useState } from "react"
import { toast } from "sonner"
import type { LogFile } from "@shared/types"
import {
  useGetLogsQuery,
  useGetLogContentQuery,
  useDeleteAllLogsMutation,
  useDeleteLogsOlderThanMutation,
} from "@/store/api"
import { PageHeader } from "@/pages/components/PageHeader"
import { PageLoading } from "@/pages/components/PageLoading"
import { LogListCard } from "@/pages/components/logs/LogListCard"
import { LogContentCard } from "@/pages/components/logs/LogContentCard"
import { DeleteLogsDialog } from "@/pages/components/logs/DeleteLogsDialog"

type DeleteConfirmMode = "all" | "olderThan" | null

export function Logs() {
  const { data: logs, isLoading } = useGetLogsQuery()
  const [selectedLog, setSelectedLog] = useState<LogFile | null>(null)
  const [deleteConfirmMode, setDeleteConfirmMode] =
    useState<DeleteConfirmMode>(null)

  const [deleteAllLogs, { isLoading: isDeletingAll }] =
    useDeleteAllLogsMutation()
  const [deleteLogsOlderThan, { isLoading: isDeletingOlderThan }] =
    useDeleteLogsOlderThanMutation()

  const { data: logContent, isLoading: isLoadingContent } =
    useGetLogContentQuery(selectedLog?.filename || "", { skip: !selectedLog })

  const handleConfirmDelete = async () => {
    if (!deleteConfirmMode) return
    try {
      if (deleteConfirmMode === "all") {
        const result = await deleteAllLogs().unwrap()
        toast.success(`Deleted ${result.deleted} log file(s)`)
      } else {
        const result = await deleteLogsOlderThan(30).unwrap()
        toast.success(
          `Deleted ${result.deleted} log file(s) older than 30 days`,
        )
      }
      setDeleteConfirmMode(null)
      setSelectedLog(null)
    } catch {
      toast.error("Failed to delete logs")
    }
  }

  const isDeleting = isDeletingAll || isDeletingOlderThan

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return <PageLoading message="Loading logs..." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        description="View operation history and command logs"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <LogListCard
          logs={logs ?? []}
          selectedLog={selectedLog}
          isDeleting={isDeleting}
          onSelect={setSelectedLog}
          onDeleteAll={() => setDeleteConfirmMode("all")}
          onDeleteOlder={() => setDeleteConfirmMode("olderThan")}
          formatDate={formatDate}
          formatSize={formatSize}
        />

        <LogContentCard
          selectedLog={selectedLog}
          logContent={logContent}
          isLoadingContent={isLoadingContent}
          formatDate={formatDate}
        />
      </div>

      <DeleteLogsDialog
        mode={deleteConfirmMode}
        isDeleting={isDeleting}
        onOpenChange={(open) => !open && setDeleteConfirmMode(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
