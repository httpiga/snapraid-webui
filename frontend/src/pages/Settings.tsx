import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useTestNotificationMutation,
  useGetSyncSafetySettingsQuery,
  useUpdateSyncSafetySettingsMutation,
} from "@/store/api";
import { toast } from "sonner";
import { Bell, Shield, KeyRound } from "lucide-react";
import type {
  NotificationSettings,
  NotificationChannel,
  SyncSafetySettings,
} from "@shared/types";
import { NotificationProviderEditDialog } from "@/components/NotificationProviderEditDialog";
import { getEmptyChannelConfig } from "@/lib/notification-channel-utils";
import { PageHeader } from "@/pages/components/PageHeader";
import { PageLoading } from "@/pages/components/PageLoading";
import { NotificationProviderCard } from "@/pages/components/settings/NotificationProviderCard";
import { getApiErrorMessage } from "@/lib/api-error";

export function Settings() {
  const { data: notificationSettings, isLoading: isLoadingNotifications } =
    useGetNotificationSettingsQuery();
  const { data: syncSafetySettings, isLoading: isLoadingSyncSafety } =
    useGetSyncSafetySettingsQuery();
  const [updateNotificationSettings] = useUpdateNotificationSettingsMutation();
  const [updateSyncSafetySettings] = useUpdateSyncSafetySettingsMutation();
  const [testNotification] = useTestNotificationMutation();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [safetySettings, setSafetySettings] =
    useState<SyncSafetySettings | null>(null);
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

  if (
    isLoadingNotifications ||
    isLoadingSyncSafety ||
    !settings ||
    !safetySettings
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
          <TabsTrigger value="auth">
            <KeyRound className="h-4 w-4 mr-1" />
            Authentication
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["telegram", "discord", "email", "slack"] as const).map(
              (channel) => (
                <NotificationProviderCard
                  key={channel}
                  channel={channel}
                  settings={settings}
                  setSettings={setSettings}
                  onEdit={() => setEditChannel(channel)}
                  onRemove={() => setRemoveChannel(channel)}
                />
              )
            )}
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
                  This will clear the {removeChannel} notification
                  configuration. You can add it again later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    removeChannel && handleRemoveConfig(removeChannel)
                  }
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Safety Settings</CardTitle>
              <CardDescription>
                Prevent accidental data loss during sync operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Safety Checks</Label>
                  <p className="text-sm text-muted-foreground">
                    Halt sync if too many files are deleted, updated, or added
                  </p>
                </div>
                <Switch
                  checked={safetySettings.enabled}
                  onCheckedChange={(checked) =>
                    setSafetySettings({ ...safetySettings, enabled: checked })
                  }
                />
              </div>
              {safetySettings.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Maximum Deleted Files</Label>
                    <Input
                      type="number"
                      value={safetySettings.maxDeletedFiles}
                      onChange={(e) =>
                        setSafetySettings({
                          ...safetySettings,
                          maxDeletedFiles: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Halt sync if more than this many files are deleted
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Updated Files</Label>
                    <Input
                      type="number"
                      value={safetySettings.maxUpdatedFiles}
                      onChange={(e) =>
                        setSafetySettings({
                          ...safetySettings,
                          maxUpdatedFiles: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Halt sync if more than this many files are modified
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Added Files</Label>
                    <Input
                      type="number"
                      value={safetySettings.maxAddedFiles}
                      onChange={(e) =>
                        setSafetySettings({
                          ...safetySettings,
                          maxAddedFiles: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Halt sync if more than this many files are added
                    </p>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Pre-hash</Label>
                  <p className="text-sm text-muted-foreground">
                    Verify data before syncing (reads data twice for extra
                    safety)
                  </p>
                </div>
                <Switch
                  checked={safetySettings.preHash}
                  onCheckedChange={(checked) =>
                    setSafetySettings({
                      ...safetySettings,
                      preHash: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Force Empty</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow sync when all original files are missing (use with
                    caution)
                  </p>
                </div>
                <Switch
                  checked={safetySettings.forceEmpty}
                  onCheckedChange={(checked) =>
                    setSafetySettings({
                      ...safetySettings,
                      forceEmpty: checked,
                    })
                  }
                />
              </div>

              <Button onClick={handleSaveSyncSafety}>
                Save Sync Safety Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Protect your SnapRAID Web UI with a password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require login to access the web UI
                  </p>
                </div>
                <Switch />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-username">Username</Label>
                <Input id="auth-username" defaultValue="admin" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-password">New Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="Leave empty to keep current"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-confirm">Confirm Password</Label>
                <Input id="auth-confirm" type="password" />
              </div>

              <Button>Save Authentication Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
