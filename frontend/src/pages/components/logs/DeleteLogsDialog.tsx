import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DeleteLogsDialogProps {
  mode: "all" | "olderThan" | null
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteLogsDialog({
  mode,
  isDeleting,
  onOpenChange,
  onConfirm,
}: DeleteLogsDialogProps) {
  return (
    <AlertDialog open={mode !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "all"
              ? "Delete all logs?"
              : "Delete logs older than 30 days?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "all"
              ? "This will permanently remove all log files. This action cannot be undone."
              : "This will permanently remove log files older than 30 days. This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
