import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import {
  useGetAuthSettingsQuery,
  useUpdateAuthSettingsMutation,
} from "@/store/api"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/api-error"
import { PageLoading } from "@/pages/components/PageLoading"

function AuthSettingsForm({
  settings,
  onSave,
  isSaving,
}: {
  settings: { enabled: boolean; username: string; hasPassword?: boolean }
  onSave: (values: {
    enabled: boolean
    username?: string
    password?: string
  }) => Promise<void>
  isSaving: boolean
}) {
  const [enabled, setEnabled] = useState(settings.enabled)
  const [username, setUsername] = useState(settings.username)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSave = async () => {
    if (enabled && !username.trim()) {
      toast.error("Username is required when authentication is enabled")
      return
    }

    const requiresPassword =
      enabled && !settings?.hasPassword && password.trim().length === 0

    if (requiresPassword) {
      toast.error("Password is required when enabling authentication")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    try {
      await onSave({
        enabled,
        username: username.trim() ? username.trim() : undefined,
        password: password.trim() ? password : undefined,
      })
      toast.success("Authentication settings saved")
      setPassword("")
      setConfirmPassword("")
    } catch (error) {
      toast.error("Failed to save authentication settings", {
        description: getApiErrorMessage(error),
      })
    }
  }

  return (
    <div className="space-y-6">
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
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-username">Username</Label>
            <Input
              id="auth-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">New Password</Label>
            <Input
              id="auth-password"
              type="password"
              placeholder="Leave empty to keep current"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-confirm">Confirm Password</Label>
            <Input
              id="auth-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSaving}
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function AuthSettingsTab() {
  const {
    data: settings,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAuthSettingsQuery()
  const [updateAuthSettings, { isLoading: isSaving }] =
    useUpdateAuthSettingsMutation()

  const handleSave = async (values: {
    enabled: boolean
    username?: string
    password?: string
  }) => {
    await updateAuthSettings({
      enabled: values.enabled,
      username: values.username,
      password: values.password,
    }).unwrap()
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {getApiErrorMessage(error)}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !settings) {
    return <PageLoading message="Loading authentication settings..." />
  }

  return (
    <AuthSettingsForm
      key={`${settings.enabled}-${settings.username}`}
      settings={settings}
      onSave={handleSave}
      isSaving={isSaving}
    />
  )
}
