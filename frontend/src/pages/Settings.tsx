import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Shield, KeyRound, Sliders } from "lucide-react";
import { PageHeader } from "@/pages/components/PageHeader";
import { NotificationsSettingsTab } from "@/pages/components/settings/NotificationsSettingsTab";
import { SyncSafetySettingsTab } from "@/pages/components/settings/SyncSafetySettingsTab";
import { AdvancedSettingsTab } from "@/pages/components/settings/AdvancedSettingsTab";
import { AuthSettingsTab } from "@/pages/components/settings/AuthSettingsTab";

export function Settings() {
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
          <NotificationsSettingsTab />
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <SyncSafetySettingsTab />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <AdvancedSettingsTab />
        </TabsContent>

        <TabsContent value="auth" className="space-y-6">
          <AuthSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
