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
import { useEffect, useState } from "react";
import type { NotificationSettings, NotificationChannel } from "@shared/types";
import { NotificationProviderEditDialog } from "@/components/NotificationProviderEditDialog";
import { NotificationProviderCard } from "@/pages/components/settings/NotificationProviderCard";
import {
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useTestNotificationMutation,
} from "@/store/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { getEmptyChannelConfig } from "@/lib/notification-channel-utils";
import { PageLoading } from "@/pages/components/PageLoading";

export function NotificationsSettingsTab() {
  const { data: notificationSettings, isLoading } =
    useGetNotificationSettingsQuery();
  const [updateNotificationSettings] = useUpdateNotificationSettingsMutation();
  const [testNotification] = useTestNotificationMutation();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [editChannel, setEditChannel] = useState<NotificationChannel | null>(
    null,
  );
  const [removeChannel, setRemoveChannel] =
    useState<NotificationChannel | null>(null);

  useEffect(() => {
    if (notificationSettings) {
      setSettings(notificationSettings);
    }
  }, [notificationSettings]);

  const handleSaveFromDialog = async (updated: NotificationSettings) => {
    try {
      await updateNotificationSettings(updated).unwrap();
      setSettings(updated);
      toast.success("Notification settings saved");
    } catch (error) {
      toast.error("Failed to save settings", {
        description: getApiErrorMessage(error),
      });
      throw error;
    }
  };

  const handleTestNotification = async (channel: NotificationChannel) => {
    await testNotification({ channel }).unwrap();
    toast.success(`Test notification sent to ${channel}`);
  };

  const handleRemoveConfig = async (channel: NotificationChannel) => {
    if (!settings) return;
    try {
      const empty = getEmptyChannelConfig(channel);
      const updated: NotificationSettings = {
        ...settings,
        channels: {
          ...settings.channels,
          [channel]: { ...empty, enabled: false },
        },
      };
      await updateNotificationSettings(updated).unwrap();
      setSettings(updated);
      setRemoveChannel(null);
      toast.success(`${channel} configuration removed`);
    } catch (error) {
      toast.error("Failed to remove configuration", {
        description: getApiErrorMessage(error),
      });
    }
  };

  if (isLoading || !settings) {
    return <PageLoading message="Loading notification settings..." />;
  }

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
          onSave={handleSaveFromDialog}
          onTest={handleTestNotification}
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
              This will clear the {removeChannel} notification configuration.
              You can add it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => removeChannel && handleRemoveConfig(removeChannel)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
