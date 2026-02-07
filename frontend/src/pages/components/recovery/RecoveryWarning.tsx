import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export function RecoveryWarning() {
  return (
    <Alert className="bg-red-500/10 border-red-500 p-4" variant="destructive">
      <div className="flex items-center gap-2">
        <AlertTriangle />
        <AlertTitle>Danger Zone</AlertTitle>
      </div>
      <AlertDescription className="text-sm text-muted-foreground">
        File recovery will restore files to their state at the last sync. <br />
        Any changes made to files after the last sync will be overwritten.{" "}
        <br />
        Make sure you have a backup of any important changes.
      </AlertDescription>
    </Alert>
  )
}
