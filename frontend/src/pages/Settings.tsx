import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useTestNotificationMutation,
  useGetSyncSafetySettingsQuery,
  useUpdateSyncSafetySettingsMutation,
  useGetAdvancedSettingsQuery,
  useUpdateAdvancedSettingsMutation,
} from "@/store/api";
import { toast } from "sonner";
import { Bell, Shield, KeyRound, Sliders } from "lucide-react";
import type {
  NotificationSettings,
  NotificationChannel,
  SyncSafetySettings,
  AdvancedSettings,
} from "@shared/types";
import { getEmptyChannelConfig } from "@/lib/notification-channel-utils";
import { PageHeader } from "@/pages/components/PageHeader";
import { PageLoading } from "@/pages/components/PageLoading";
import { getApiErrorMessage } from "@/lib/api-error";
import { NotificationsSettingsTab } from "@/pages/components/settings/NotificationsSettingsTab";
import { SyncSafetySettingsTab } from "@/pages/components/settings/SyncSafetySettingsTab";
import { AdvancedSettingsTab } from "@/pages/components/settings/AdvancedSettingsTab";
import { AuthSettingsTab } from "@/pages/components/settings/AuthSettingsTab";

export function Settings() {
  const { data: notificationSettings, isLoading: isLoadingNotifications } =
    useGetNotificationSettingsQuery();

  const { data: syncSafetySettings, isLoading: isLoadingSyncSafety } =
    useGetSyncSafetySettingsQuery();
  const { data: advancedSettings, isLoading: isLoadingAdvanced } =
    useGetAdvancedSettingsQuery();
  const [updateNotificationSettings] = useUpdateNotificationSettingsMutation();
  const [updateSyncSafetySettings] = useUpdateSyncSafetySettingsMutation();
  const [updateAdvancedSettings] = useUpdateAdvancedSettingsMutation();
  const [testNotification] = useTestNotificationMutation();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [safetySettings, setSafetySettings] =
    useState<SyncSafetySettings | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedSettings | null>(null);
  const [editChannel, setEditChannel] = useState<NotificationChannel | null>(
    null
  );
  const [removeChannel, setRemoveChannel] =
    useState<NotificationChannel | null>(null);

  useEffect(() => {
    if (notificationSettings) {
      setSettings(notificationSettings);
    }
  }, [notificationSettings]);

  useEffect(() => {
    if (syncSafetySettings) {
      setSafetySettings(syncSafetySettings);
    }
  }, [syncSafetySettings]);

  useEffect(() => {
    if (advancedSettings) {
      setAdvanced(advancedSettings);
    }
  }, [advancedSettings]);

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

  const handleSaveSyncSafety = async () => {
    if (!safetySettings) return;
    try {
      await updateSyncSafetySettings(safetySettings).unwrap();
      toast.success("Sync safety settings saved");
    } catch (error) {
      toast.error("Failed to save sync safety settings", {
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleSaveAdvanced = async () => {
    if (!advanced) return;
    try {
      await updateAdvancedSettings(advanced).unwrap();
      toast.success("Advanced settings saved");
    } catch (error) {
      toast.error("Failed to save advanced settings", {
        description: getApiErrorMessage(error),
      });
    }
  };

  if (
    isLoadingNotifications ||
    isLoadingSyncSafety ||
    isLoadingAdvanced ||
    !settings ||
    !safetySettings ||
    !advanced
  ) {
    return <PageLoading message="Loading settings..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure notifications and application settings"
      />

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-1" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="sync">
            <Shield className="h-4 w-4 mr-1" />
            Sync Safety
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Sliders className="h-4 w-4 mr-1" />
            Advanced
          </TabsTrigger>
          <TabsTrigger value="auth">
            <KeyRound className="h-4 w-4 mr-1" />
            Authentication
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationsSettingsTab
            settings={settings}
            setSettings={
              setSettings as React.Dispatch<
                React.SetStateAction<NotificationSettings>
              >
            }
            editChannel={editChannel}
            setEditChannel={setEditChannel}
            removeChannel={removeChannel}
            setRemoveChannel={setRemoveChannel}
            onSaveFromDialog={handleSaveFromDialog}
            onTestNotification={handleTestNotification}
            onRemoveConfig={handleRemoveConfig}
          />
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <SyncSafetySettingsTab
            safetySettings={safetySettings}
            setSafetySettings={
              setSafetySettings as React.Dispatch<
                React.SetStateAction<SyncSafetySettings>
              >
            }
            onSave={handleSaveSyncSafety}
          />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <AdvancedSettingsTab
            advanced={advanced}
            setAdvanced={
              setAdvanced as React.Dispatch<
                React.SetStateAction<AdvancedSettings>
              >
            }
            onSave={handleSaveAdvanced}
          />
        </TabsContent>

        <TabsContent value="auth" className="space-y-6">
          <AuthSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
