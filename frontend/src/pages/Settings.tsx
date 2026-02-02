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
  useGetAuthSettingsQuery,
  useUpdateAuthSettingsMutation,
  useGetAuthStatusQuery,
  useLogoutMutation,
} from "@/store/api";
import { toast } from "sonner";
import {
  Bell,
  Shield,
  Settings as SettingsIcon,
} from "lucide-react";
import type { NotificationSettings, NotificationChannel } from "@shared/types";
import { NotificationProviderEditDialog } from "@/components/NotificationProviderEditDialog";
import { getEmptyChannelConfig } from "@/lib/notification-channel-utils";
import { PageHeader } from "@/pages/components/PageHeader";
import { PageLoading } from "@/pages/components/PageLoading";
import { NotificationProviderCard } from "@/pages/components/settings/NotificationProviderCard";
import { getApiErrorMessage } from "@/lib/api-error";

export function Settings() {
  const { data: notificationSettings, isLoading } =
    useGetNotificationSettingsQuery();
  const { data: authSettings, isLoading: isAuthLoading } =
    useGetAuthSettingsQuery();
  const { data: authStatus } = useGetAuthStatusQuery();
  const [updateNotificationSettings] = useUpdateNotificationSettingsMutation();
  const [testNotification] = useTestNotificationMutation();
  const [updateAuthSettings, { isLoading: isSavingAuth }] =
    useUpdateAuthSettingsMutation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [editChannel, setEditChannel] = useState<NotificationChannel | null>(
    null
  );
  const [removeChannel, setRemoveChannel] =
    useState<NotificationChannel | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authUsername, setAuthUsername] = useState("admin");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");

  useEffect(() => {
    if (notificationSettings) {
      setSettings(notificationSettings);
    }
  }, [notificationSettings]);

  useEffect(() => {
    if (authSettings) {
      setAuthEnabled(authSettings.enabled);
      setAuthUsername(authSettings.username);
    }
  }, [authSettings]);

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

  const handleSaveAuthSettings = async () => {
    if (!authUsername.trim()) {
      toast.error("Username is required");
      return;
    }
    if (authPassword && authPassword !== authConfirm) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      await updateAuthSettings({
        enabled: authEnabled,
        username: authUsername.trim(),
        password: authPassword ? authPassword : undefined,
      }).unwrap();
      setAuthPassword("");
      setAuthConfirm("");
      toast.success("Authentication settings saved");
    } catch (error) {
      toast.error("Failed to save authentication settings", {
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      toast.success("Logged out");
    } catch (error) {
      toast.error("Failed to log out", {
        description: getApiErrorMessage(error),
      });
    }
  };

  if (isLoading || !settings || isAuthLoading || !authSettings) {
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
            <SettingsIcon className="h-4 w-4 mr-1" />
            Sync Safety
          </TabsTrigger>
          <TabsTrigger value="auth">
            <Shield className="h-4 w-4 mr-1" />
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
                    Stop sync if too many files are deleted
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="space-y-2">
                <Label>Maximum Deleted Files</Label>
                <Input type="number" defaultValue={100} />
                <p className="text-xs text-muted-foreground">
                  Stop sync if more than this many files are deleted
                </p>
              </div>

              <div className="space-y-2">
                <Label>Maximum Delete Percentage</Label>
                <Input type="number" defaultValue={10} />
                <p className="text-xs text-muted-foreground">
                  Stop sync if more than this percentage of files are deleted
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Run Diff Before Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Always check changes before syncing
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
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
                <Switch
                  checked={authEnabled}
                  onCheckedChange={setAuthEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-username">Username</Label>
                <Input
                  id="auth-username"
                  value={authUsername}
                  onChange={(event) => setAuthUsername(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-password">New Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="Leave empty to keep current"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-confirm">Confirm Password</Label>
                <Input
                  id="auth-confirm"
                  type="password"
                  value={authConfirm}
                  onChange={(event) => setAuthConfirm(event.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSaveAuthSettings} disabled={isSavingAuth}>
                  {isSavingAuth ? "Saving..." : "Save Authentication Settings"}
                </Button>
                {authStatus?.authenticated && authEnabled && (
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? "Logging out..." : "Log out"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
