import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { NotificationChannel, NotificationSettings } from "@shared/types";
import { getChannelConfigSummary } from "@/lib/notification-channel-utils";
import { useUpdateNotificationSettingsMutation } from "@/store/api";
import { getApiErrorMessage } from "@/lib/api-error";

interface NotificationProviderCardProps {
  channel: NotificationChannel;
  settings: NotificationSettings;
  setSettings: (s: NotificationSettings) => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function NotificationProviderCard({
  channel,
  settings,
  setSettings,
  onEdit,
  onRemove,
}: NotificationProviderCardProps) {
  const [updateNotificationSettings] = useUpdateNotificationSettingsMutation();
  const channelSettings = settings.channels[channel];
  const summary = getChannelConfigSummary(channel, settings);
  const hasConfig =
    summary !== "No configuration set" && summary !== "No webhook set";

  const handleToggleEnabled = async (checked: boolean) => {
    const updated: NotificationSettings = {
      ...settings,
      channels: {
        ...settings.channels,
        [channel]: { ...channelSettings, enabled: checked },
      },
    };
    setSettings(updated);
    try {
      await updateNotificationSettings(updated).unwrap();
      toast.success(
        checked
          ? `${channel} notifications enabled`
          : `${channel} notifications disabled`,
      );
    } catch (error) {
      setSettings(settings);
      toast.error("Failed to update", {
        description: getApiErrorMessage(error),
      });
    }
  };

  const labels: Record<NotificationChannel, { title: string; desc: string }> = {
    discord: {
      title: "Discord",
      desc: "Send notifications to a Discord channel",
    },
    telegram: {
      title: "Telegram",
      desc: "Send notifications to Telegram",
    },
    email: {
      title: "Email",
      desc: "Send notifications via email",
    },
    slack: {
      title: "Slack",
      desc: "Send notifications to Slack",
    },
  };

  const icons: Record<NotificationChannel, ReactNode> = {
    discord: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
      </svg>
    ),
    telegram: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.287 5.906q-1.168.486-4.666 2.01-.567.225-.595.442c-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294q.39.01.868-.32 3.269-2.206 3.374-2.23c.05-.012.12-.026.166.016s.042.12.037.141c-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8 8 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629q.14.092.27.187c.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.4 1.4 0 0 0-.013-.315.34.34 0 0 0-.114-.217.53.53 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09" />
      </svg>
    ),
    email: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z" />
      </svg>
    ),
    slack: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="M3.362 10.11c0 .926-.756 1.681-1.681 1.681S0 11.036 0 10.111.756 8.43 1.68 8.43h1.682zm.846 0c0-.924.756-1.68 1.681-1.68s1.681.756 1.681 1.68v4.21c0 .924-.756 1.68-1.68 1.68a1.685 1.685 0 0 1-1.682-1.68zM5.89 3.362c-.926 0-1.682-.756-1.682-1.681S4.964 0 5.89 0s1.68.756 1.68 1.68v1.682zm0 .846c.924 0 1.68.756 1.68 1.681S6.814 7.57 5.89 7.57H1.68C.757 7.57 0 6.814 0 5.89c0-.926.756-1.682 1.68-1.682zm6.749 1.682c0-.926.755-1.682 1.68-1.682S16 4.964 16 5.889s-.756 1.681-1.68 1.681h-1.681zm-.848 0c0 .924-.755 1.68-1.68 1.68A1.685 1.685 0 0 1 8.43 5.89V1.68C8.43.757 9.186 0 10.11 0c.926 0 1.681.756 1.681 1.68zm-1.681 6.748c.926 0 1.682.756 1.682 1.681S11.036 16 10.11 16s-1.681-.756-1.681-1.68v-1.682h1.68zm0-.847c-.924 0-1.68-.755-1.68-1.68s.756-1.681 1.68-1.681h4.21c.924 0 1.68.756 1.68 1.68 0 .926-.756 1.681-1.68 1.681z" />
      </svg>
    ),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icons[channel]}
          {labels[channel].title}
        </CardTitle>
        <CardDescription>{labels[channel].desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex flex-col justify-between h-full">
        <div className="space-y-2">
          {hasConfig && (
            <div className="flex items-center justify-between">
              <Label>Enable {labels[channel].title} notifications</Label>
              <Switch
                checked={channelSettings.enabled}
                onCheckedChange={handleToggleEnabled}
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {hasConfig ? summary : "No configuration set"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={channel !== "telegram"}
          >
            {hasConfig ? (
              <Pencil className="h-4 w-4 mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            {hasConfig ? "Edit" : "Add"}
          </Button>
          {hasConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
