import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export function RecoveryWarning() {
  return (
    <Alert className="bg-orange-500/10 border-orange-500 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-orange-500" />
        <AlertTitle className="text-orange-500">Danger Zone</AlertTitle>
      </div>
      <AlertDescription className="text-sm text-muted-foreground">
        File recovery will restore files to their state at the last sync. <br />
        Any changes made to files after the last sync will be overwritten.{" "}
        <br />
        Make sure you have a backup of any important changes.
      </AlertDescription>
    </Alert>
  );
}
