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
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useTestNotificationMutation,
} from "@/store/api";
import { toast } from "@/hooks/use-toast";
import {
  Bell,
  Shield,
  Settings as SettingsIcon,
  Send,
  MessageSquare,
  Mail,
  Hash,
} from "lucide-react";
import type { NotificationSettings, NotificationChannel } from "@shared/types";

export function Settings() {
  const { data: notificationSettings, isLoading } =
    useGetNotificationSettingsQuery();
  const [updateNotificationSettings] = useUpdateNotificationSettingsMutation();
  const [testNotification] = useTestNotificationMutation();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    if (notificationSettings) {
      setSettings(notificationSettings);
    }
  }, [notificationSettings]);

  const handleSaveNotifications = async () => {
    if (!settings) return;

    try {
      await updateNotificationSettings(settings).unwrap();
      toast({ title: "Notification settings saved" });
    } catch (error) {
      toast({
        title: "Failed to save settings",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleTestNotification = async (channel: NotificationChannel) => {
    try {
      await testNotification({ channel }).unwrap();
      toast({ title: `Test notification sent to ${channel}` });
    } catch (error) {
      toast({
        title: "Test failed",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure notifications and application settings
        </p>
      </div>

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

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Discord */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Discord
              </CardTitle>
              <CardDescription>
                Send notifications to a Discord channel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="discord-enabled">
                  Enable Discord notifications
                </Label>
                <Switch
                  id="discord-enabled"
                  checked={settings.channels.discord.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      channels: {
                        ...settings.channels,
                        discord: {
                          ...settings.channels.discord,
                          enabled: checked,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discord-webhook">Webhook URL</Label>
                <Input
                  id="discord-webhook"
                  value={settings.channels.discord.webhookUrl}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      channels: {
                        ...settings.channels,
                        discord: {
                          ...settings.channels.discord,
                          webhookUrl: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="https://discord.com/api/webhooks/..."
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestNotification("discord")}
                disabled={
                  !settings.channels.discord.enabled ||
                  !settings.channels.discord.webhookUrl
                }
              >
                <Send className="h-4 w-4 mr-1" />
                Test
              </Button>
            </CardContent>
          </Card>

          {/* Telegram */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Telegram
              </CardTitle>
              <CardDescription>Send notifications to Telegram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="telegram-enabled">
                  Enable Telegram notifications
                </Label>
                <Switch
                  id="telegram-enabled"
                  checked={settings.channels.telegram.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      channels: {
                        ...settings.channels,
                        telegram: {
                          ...settings.channels.telegram,
                          enabled: checked,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telegram-token">Bot Token</Label>
                  <Input
                    id="telegram-token"
                    value={settings.channels.telegram.botToken}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          telegram: {
                            ...settings.channels.telegram,
                            botToken: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="123456:ABC-DEF1234..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram-chat">Chat ID</Label>
                  <Input
                    id="telegram-chat"
                    value={settings.channels.telegram.chatId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          telegram: {
                            ...settings.channels.telegram,
                            chatId: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="-1001234567890"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestNotification("telegram")}
                disabled={
                  !settings.channels.telegram.enabled ||
                  !settings.channels.telegram.botToken
                }
              >
                <Send className="h-4 w-4 mr-1" />
                Test
              </Button>
            </CardContent>
          </Card>

          {/* Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email
              </CardTitle>
              <CardDescription>Send notifications via email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-enabled">
                  Enable email notifications
                </Label>
                <Switch
                  id="email-enabled"
                  checked={settings.channels.email.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      channels: {
                        ...settings.channels,
                        email: { ...settings.channels.email, enabled: checked },
                      },
                    })
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    value={settings.channels.email.smtpHost}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          email: {
                            ...settings.channels.email,
                            smtpHost: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={settings.channels.email.smtpPort}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          email: {
                            ...settings.channels.email,
                            smtpPort: parseInt(e.target.value),
                          },
                        },
                      })
                    }
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">SMTP Username</Label>
                  <Input
                    id="smtp-user"
                    value={settings.channels.email.smtpUser}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          email: {
                            ...settings.channels.email,
                            smtpUser: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">SMTP Password</Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    value={settings.channels.email.smtpPass}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          email: {
                            ...settings.channels.email,
                            smtpPass: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-address">From Address</Label>
                  <Input
                    id="from-address"
                    value={settings.channels.email.fromAddress}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          email: {
                            ...settings.channels.email,
                            fromAddress: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="snapraid@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to-addresses">
                    To Addresses (comma separated)
                  </Label>
                  <Input
                    id="to-addresses"
                    value={settings.channels.email.toAddresses.join(", ")}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        channels: {
                          ...settings.channels,
                          email: {
                            ...settings.channels.email,
                            toAddresses: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        },
                      })
                    }
                    placeholder="admin@example.com"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="smtp-secure"
                  checked={settings.channels.email.smtpSecure}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      channels: {
                        ...settings.channels,
                        email: {
                          ...settings.channels.email,
                          smtpSecure: checked,
                        },
                      },
                    })
                  }
                />
                <Label htmlFor="smtp-secure">Use SSL/TLS</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestNotification("email")}
                disabled={
                  !settings.channels.email.enabled ||
                  !settings.channels.email.smtpHost
                }
              >
                <Send className="h-4 w-4 mr-1" />
                Test
              </Button>
            </CardContent>
          </Card>

          {/* Slack */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Slack
              </CardTitle>
              <CardDescription>Send notifications to Slack</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="slack-enabled">
                  Enable Slack notifications
                </Label>
                <Switch
                  id="slack-enabled"
                  checked={settings.channels.slack.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      channels: {
                        ...settings.channels,
                        slack: { ...settings.channels.slack, enabled: checked },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slack-webhook">Webhook URL</Label>
                <Input
                  id="slack-webhook"
                  value={settings.channels.slack.webhookUrl}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      channels: {
                        ...settings.channels,
                        slack: {
                          ...settings.channels.slack,
                          webhookUrl: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestNotification("slack")}
                disabled={
                  !settings.channels.slack.enabled ||
                  !settings.channels.slack.webhookUrl
                }
              >
                <Send className="h-4 w-4 mr-1" />
                Test
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications}>
              Save Notification Settings
            </Button>
          </div>
        </TabsContent>

        {/* Sync Safety Tab */}
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

        {/* Authentication Tab */}
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
