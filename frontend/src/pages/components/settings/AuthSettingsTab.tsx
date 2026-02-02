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
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  useGetAuthSettingsQuery,
  useGetAuthStatusQuery,
  useLogoutMutation,
  useUpdateAuthSettingsMutation,
} from "@/store/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { PageLoading } from "../PageLoading";

export function AuthSettingsTab() {
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const { data: authSettings, isLoading: isAuthLoading } =
    useGetAuthSettingsQuery();
  const { data: authStatus } = useGetAuthStatusQuery();
  const [updateAuthSettings, { isLoading: isSavingAuth }] =
    useUpdateAuthSettingsMutation();

  const [authEnabled, setAuthEnabled] = useState(false);
  const [authUsername, setAuthUsername] = useState("admin");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");

  useEffect(() => {
    if (authSettings) {
      setAuthEnabled(authSettings.enabled);
      setAuthUsername(authSettings.username);
    }
  }, [authSettings]);

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

  if (isAuthLoading || !authSettings) {
    return <PageLoading message="Loading settings..." />;
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
            <Switch checked={authEnabled} onCheckedChange={setAuthEnabled} />
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
    </div>
  );
}
