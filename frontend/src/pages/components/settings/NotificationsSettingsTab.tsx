import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  NotificationSettings,
  NotificationChannel,
} from "@shared/types";
import { NotificationProviderEditDialog } from "@/components/NotificationProviderEditDialog";
import { NotificationProviderCard } from "@/pages/components/settings/NotificationProviderCard";

interface NotificationsSettingsTabProps {
  settings: NotificationSettings;
  setSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  editChannel: NotificationChannel | null;
  setEditChannel: (channel: NotificationChannel | null) => void;
  removeChannel: NotificationChannel | null;
  setRemoveChannel: (channel: NotificationChannel | null) => void;
  onSaveFromDialog: (updated: NotificationSettings) => Promise<void>;
  onTestNotification: (channel: NotificationChannel) => Promise<void>;
  onRemoveConfig: (channel: NotificationChannel) => Promise<void>;
}

export function NotificationsSettingsTab({
  settings,
  setSettings,
  editChannel,
  setEditChannel,
  removeChannel,
  setRemoveChannel,
  onSaveFromDialog,
  onTestNotification,
  onRemoveConfig,
}: NotificationsSettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["telegram", "discord", "email", "slack"] as const).map((channel) => (
          <NotificationProviderCard
            key={channel}
            channel={channel}
            settings={settings}
            setSettings={setSettings}
            onEdit={() => setEditChannel(channel)}
            onRemove={() => setRemoveChannel(channel)}
          />
        ))}
      </div>

      {editChannel && settings && (
        <NotificationProviderEditDialog
          channel={editChannel}
          settings={settings}
          open={!!editChannel}
          onOpenChange={(open) => !open && setEditChannel(null)}
          onSave={onSaveFromDialog}
          onTest={onTestNotification}
        />
      )}

      <AlertDialog
        open={!!removeChannel}
        onOpenChange={(open) => !open && setRemoveChannel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the {removeChannel} notification configuration. You
              can add it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => removeChannel && onRemoveConfig(removeChannel)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
