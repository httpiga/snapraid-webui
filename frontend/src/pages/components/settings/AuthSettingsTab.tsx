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

export function AuthSettingsTab() {
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

          <Button>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
