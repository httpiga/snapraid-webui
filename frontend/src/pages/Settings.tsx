import React, { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useTestNotificationMutation,
  useGetSyncSafetySettingsQuery,
  useUpdateSyncSafetySettingsMutation,
  useGetAdvancedSettingsQuery,
  useUpdateAdvancedSettingsMutation,
} from "@/store/api"
import { toast } from "sonner"
import { Bell, Shield, KeyRound, Sliders } from "lucide-react"
import type {
  NotificationSettings,
  NotificationChannel,
  SyncSafetySettings,
  AdvancedSettings,
} from "@shared/types"
import { getEmptyChannelConfig } from "@/lib/notification-channel-utils"
import { PageHeader } from "@/pages/components/PageHeader"
import { PageLoading } from "@/pages/components/PageLoading"
import { useSyncedSettings } from "@/hooks/use-synced-settings"
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast"
import { NotificationsSettingsTab } from "@/pages/components/settings/NotificationsSettingsTab"
import { SyncSafetySettingsTab } from "@/pages/components/settings/SyncSafetySettingsTab"
import { AdvancedSettingsTab } from "@/pages/components/settings/AdvancedSettingsTab"
import { AuthSettingsTab } from "@/pages/components/settings/AuthSettingsTab"

export function Settings() {
  const { data: notificationSettings, isLoading: isLoadingNotifications } =
    useGetNotificationSettingsQuery()
  const { data: syncSafetySettings, isLoading: isLoadingSyncSafety } =
    useGetSyncSafetySettingsQuery()
  const { data: advancedSettings, isLoading: isLoadingAdvanced } =
    useGetAdvancedSettingsQuery()
  const [updateNotificationSettings] = useUpdateNotificationSettingsMutation()
  const [updateSyncSafetySettings] = useUpdateSyncSafetySettingsMutation()
  const [updateAdvancedSettings] = useUpdateAdvancedSettingsMutation()
  const [testNotification] = useTestNotificationMutation()

  const [settings, setSettings] = useSyncedSettings(notificationSettings)
  const [safetySettings, setSafetySettings] =
    useSyncedSettings(syncSafetySettings)
  const [advanced, setAdvanced] = useSyncedSettings(advancedSettings)
  const [editChannel, setEditChannel] = useState<NotificationChannel | null>(
    null,
  )
  const [removeChannel, setRemoveChannel] =
    useState<NotificationChannel | null>(null)

  const saveNotificationSettingsWithToast = useMutationWithToast(
    updateNotificationSettings,
    {
      successMessage: "Notification settings saved",
      errorMessage: "Failed to save settings",
      rethrow: true,
      onSuccess: setSettings,
    },
  )

  const handleSaveFromDialog = async (updated: NotificationSettings) => {
    await saveNotificationSettingsWithToast(updated)
  }

  const handleTestNotification = async (channel: NotificationChannel) => {
    await testNotification({ channel }).unwrap()
    toast.success(`Test notification sent to ${channel}`)
  }

  const saveSyncSafetyWithToast = useMutationWithToast(
    updateSyncSafetySettings,
    {
      successMessage: "Sync safety settings saved",
      errorMessage: "Failed to save sync safety settings",
    },
  )
  const saveAdvancedWithToast = useMutationWithToast(
    updateAdvancedSettings,
    {
      successMessage: "Advanced settings saved",
      errorMessage: "Failed to save advanced settings",
    },
  )

  const handleRemoveConfig = async (channel: NotificationChannel) => {
    if (!settings) return
    const empty = getEmptyChannelConfig(channel)
    const updated: NotificationSettings = {
      ...settings,
      channels: {
        ...settings.channels,
        [channel]: { ...empty, enabled: false },
      },
    }
    await saveNotificationSettingsWithToast(updated)
    setRemoveChannel(null)
  }

  const handleSaveSyncSafety = async () => {
    if (safetySettings) await saveSyncSafetyWithToast(safetySettings)
  }

  const handleSaveAdvanced = async () => {
    if (advanced) await saveAdvancedWithToast(advanced)
  }

  if (
    isLoadingNotifications ||
    isLoadingSyncSafety ||
    isLoadingAdvanced ||
    !settings ||
    !safetySettings ||
    !advanced
  ) {
    return <PageLoading message="Loading settings..." />
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
  )
}
