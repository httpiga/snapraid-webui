import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Send } from "lucide-react"
import type {
  NotificationChannel,
  NotificationEvent,
  NotificationSettings,
  DiscordSettings,
  TelegramSettings,
  EmailSettings,
  SlackSettings,
} from "@shared/types"
import type { ChannelConfig } from "@/lib/notification-channel-utils"
import { NOTIFICATION_EVENTS } from "@shared/types"

interface NotificationProviderEditDialogProps {
  channel: NotificationChannel
  settings: NotificationSettings
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updated: NotificationSettings) => Promise<void>
  onTest: (channel: NotificationChannel) => Promise<void>
}

function getChannelConfig(
  settings: NotificationSettings,
  channel: NotificationChannel,
): ChannelConfig {
  return settings.channels[channel]
}

function mergeChannelIntoSettings(
  settings: NotificationSettings,
  channel: NotificationChannel,
  config: ChannelConfig,
): NotificationSettings {
  return {
    ...settings,
    channels: {
      ...settings.channels,
      [channel]: config,
    },
  }
}

export function NotificationProviderEditDialog({
  channel,
  settings,
  open,
  onOpenChange,
  onSave,
  onTest,
}: NotificationProviderEditDialogProps) {
  const current = getChannelConfig(settings, channel)
  const [draft, setDraft] = useState<ChannelConfig>(current)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const eventLabels: Record<NotificationEvent, string> = {
    sync_complete: "Sync complete",
    sync_error: "Sync error",
    sync_aborted: "Sync aborted",
    sync_safety_halt: "Sync safety halt",
    scrub_complete: "Scrub complete",
    scrub_error: "Scrub error",
  }

  useEffect(() => {
    if (open) {
      const currentConfig = getChannelConfig(settings, channel)
      setDraft({
        ...currentConfig,
        events:
          currentConfig.events?.length > 0
            ? currentConfig.events
            : [...NOTIFICATION_EVENTS],
      })
    }
  }, [open, settings, channel])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(mergeChannelIntoSettings(settings, channel, draft))
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      // Force enable the channel before testing
      const enabledSettings = {
        ...settings,
        channels: {
          ...settings.channels,
          [channel]: { ...draft, enabled: true },
        },
      }
      await onSave(enabledSettings)
      await onTest(channel)
    } finally {
      setTesting(false)
    }
  }

  const title =
    channel === "discord"
      ? "Discord"
      : channel === "telegram"
        ? "Telegram"
        : channel === "email"
          ? "Email"
          : "Slack"

  const toggleEvent = (event: NotificationEvent) => {
    const currentEvents = draft.events ?? []
    const nextEvents = currentEvents.includes(event)
      ? currentEvents.filter((value) => value !== event)
      : [...currentEvents, event]
    setDraft({ ...draft, events: nextEvents })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Edit {title} configuration</DialogTitle>
          <DialogDescription>
            Set credentials and options. Save to persist, or send a test
            notification (saves first).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {channel === "discord" && (
            <DiscordForm
              config={draft as DiscordSettings}
              onChange={setDraft as (c: DiscordSettings) => void}
            />
          )}
          {channel === "telegram" && (
            <TelegramForm
              config={draft as TelegramSettings}
              onChange={setDraft as (c: TelegramSettings) => void}
            />
          )}
          {channel === "email" && (
            <EmailForm
              config={draft as EmailSettings}
              onChange={setDraft as (c: EmailSettings) => void}
            />
          )}
          {channel === "slack" && (
            <SlackForm
              config={draft as SlackSettings}
              onChange={setDraft as (c: SlackSettings) => void}
            />
          )}
          <div className="space-y-3">
            <div>
              <Label>Notification events</Label>
              <p className="text-sm text-muted-foreground">
                Select which events trigger notifications for this channel.
              </p>
            </div>
            <div className="space-y-2">
              {NOTIFICATION_EVENTS.map((event) => (
                <div key={event} className="flex items-center gap-2">
                  <Switch
                    id={`event-${channel}-${event}`}
                    checked={draft.events?.includes(event) ?? false}
                    onCheckedChange={() => toggleEvent(event)}
                  />
                  <Label htmlFor={`event-${channel}-${event}`}>
                    {eventLabels[event]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter showCloseButton={false}>
          <div className="flex justify-between w-full">
            <Button
              variant="secondary"
              onClick={handleTest}
              disabled={saving || testing}
            >
              <Send className="h-4 w-4 mr-1" />
              {testing ? "Sending…" : "Send test"}
            </Button>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving || testing}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || testing}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DiscordForm({
  config,
  onChange,
}: {
  config: DiscordSettings
  onChange: (c: DiscordSettings) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="edit-discord-webhook">Webhook URL (required)</Label>
      <Input
        id="edit-discord-webhook"
        type="url"
        value={config.webhookUrl}
        onChange={(e) => onChange({ ...config, webhookUrl: e.target.value })}
        placeholder="https://discord.com/api/webhooks/123456789/abcdef..."
      />
      <p className="text-sm text-muted-foreground">
        Create an incoming webhook in your Discord channel (Channel settings →
        Integrations → Webhooks) and paste the webhook URL here.
      </p>
    </div>
  )
}

function TelegramForm({
  config,
  onChange,
}: {
  config: TelegramSettings
  onChange: (c: TelegramSettings) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-telegram-token">Bot Token</Label>
        <Input
          id="edit-telegram-token"
          value={config.botToken}
          onChange={(e) => onChange({ ...config, botToken: e.target.value })}
          placeholder="123456:ABC-DEF1234..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-telegram-chat">Chat ID</Label>
        <Input
          id="edit-telegram-chat"
          value={config.chatId}
          onChange={(e) => onChange({ ...config, chatId: e.target.value })}
          placeholder="-1001234567890"
        />
      </div>
    </div>
  )
}

function EmailForm({
  config,
  onChange,
}: {
  config: EmailSettings
  onChange: (c: EmailSettings) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-smtp-host">SMTP Host</Label>
          <Input
            id="edit-smtp-host"
            value={config.smtpHost}
            onChange={(e) => onChange({ ...config, smtpHost: e.target.value })}
            placeholder="smtp.gmail.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-smtp-port">SMTP Port</Label>
          <Input
            id="edit-smtp-port"
            type="number"
            value={config.smtpPort || ""}
            onChange={(e) =>
              onChange({
                ...config,
                smtpPort: parseInt(e.target.value, 10) || 587,
              })
            }
            placeholder="587"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-smtp-user">SMTP Username</Label>
          <Input
            id="edit-smtp-user"
            value={config.smtpUser}
            onChange={(e) => onChange({ ...config, smtpUser: e.target.value })}
            placeholder="user@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-smtp-pass">SMTP Password</Label>
          <Input
            id="edit-smtp-pass"
            type="password"
            value={config.smtpPass}
            onChange={(e) => onChange({ ...config, smtpPass: e.target.value })}
            placeholder="••••••••"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-from-address">From Address</Label>
        <Input
          id="edit-from-address"
          value={config.fromAddress}
          onChange={(e) => onChange({ ...config, fromAddress: e.target.value })}
          placeholder="snapraid@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-to-addresses">
          To Addresses (comma separated)
        </Label>
        <Input
          id="edit-to-addresses"
          value={config.toAddresses.join(", ")}
          onChange={(e) =>
            onChange({
              ...config,
              toAddresses: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="admin@example.com"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="edit-smtp-secure"
          checked={config.smtpSecure}
          onCheckedChange={(checked: boolean) =>
            onChange({ ...config, smtpSecure: checked })
          }
        />
        <Label htmlFor="edit-smtp-secure">Use SSL/TLS</Label>
      </div>
    </div>
  )
}

function SlackForm({
  config,
  onChange,
}: {
  config: SlackSettings
  onChange: (c: SlackSettings) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="edit-slack-webhook">Webhook URL</Label>
      <Input
        id="edit-slack-webhook"
        value={config.webhookUrl}
        onChange={(e) => onChange({ ...config, webhookUrl: e.target.value })}
        placeholder="https://hooks.slack.com/services/..."
      />
    </div>
  )
}
