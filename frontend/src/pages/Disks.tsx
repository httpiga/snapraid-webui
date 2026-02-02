import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetConfigQuery,
  useGetRawConfigQuery,
  useUpdateConfigMutation,
  useUpdateRawConfigMutation,
} from "@/store/api";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { ParsedSnapRaidConfig } from "@shared/types";
import { PageHeader } from "@/pages/components/PageHeader";
import { PageLoading } from "@/pages/components/PageLoading";
import { ParityDisksCard } from "@/pages/components/disks/ParityDisksCard";
import { DataDisksCard } from "@/pages/components/disks/DataDisksCard";
import { ContentFilesCard } from "@/pages/components/disks/ContentFilesCard";
import { RawConfigEditor } from "@/pages/components/disks/RawConfigEditor";
import { getApiErrorMessage } from "@/lib/api-error";
import { getNextDataDiskName } from "@/lib/disk-config-utils";

export function Disks() {
  const { data: config, isLoading } = useGetConfigQuery();
  const { data: rawConfig } = useGetRawConfigQuery();
  const [updateConfig] = useUpdateConfigMutation();
  const [updateRawConfig] = useUpdateRawConfigMutation();

  const [editedConfig, setEditedConfig] = useState<ParsedSnapRaidConfig | null>(
    null
  );
  const [editedRaw, setEditedRaw] = useState<string>("");
  const [activeTab, setActiveTab] = useState("visual");

  const currentConfig = editedConfig || config;
  const currentRaw = editedRaw || rawConfig || "";

  const handleAddParity = () => {
    if (!currentConfig) return;
    setEditedConfig({
      ...currentConfig,
      parity: [...currentConfig.parity, ""],
    });
  };

  const handleRemoveParity = (index: number) => {
    if (!currentConfig) return;
    setEditedConfig({
      ...currentConfig,
      parity: currentConfig.parity.filter((_, i) => i !== index),
    });
  };

  const handleUpdateParity = (index: number, value: string) => {
    if (!currentConfig) return;
    const newParity = [...currentConfig.parity];
    newParity[index] = value;
    setEditedConfig({
      ...currentConfig,
      parity: newParity,
    });
  };

  const handleAddData = () => {
    if (!currentConfig) return;
    const newName = getNextDataDiskName(currentConfig.data);
    setEditedConfig({
      ...currentConfig,
      data: { ...currentConfig.data, [newName]: "" },
    });
  };

  const handleRemoveData = (name: string) => {
    if (!currentConfig) return;
    const newData = { ...currentConfig.data };
    delete newData[name];
    setEditedConfig({
      ...currentConfig,
      data: newData,
    });
  };

  const handleUpdateData = (oldName: string, newName: string, path: string) => {
    if (!currentConfig) return;
    const newData = { ...currentConfig.data };
    if (oldName !== newName) {
      delete newData[oldName];
    }
    newData[newName] = path;
    setEditedConfig({
      ...currentConfig,
      data: newData,
    });
  };

  const handleAddContent = () => {
    if (!currentConfig) return;
    setEditedConfig({
      ...currentConfig,
      content: [...currentConfig.content, ""],
    });
  };

  const handleRemoveContent = (index: number) => {
    if (!currentConfig) return;
    setEditedConfig({
      ...currentConfig,
      content: currentConfig.content.filter((_, i) => i !== index),
    });
  };

  const handleUpdateContent = (index: number, value: string) => {
    if (!currentConfig) return;
    const newContent = [...currentConfig.content];
    newContent[index] = value;
    setEditedConfig({
      ...currentConfig,
      content: newContent,
    });
  };

  const handleSaveVisual = async () => {
    if (!editedConfig) return;

    try {
      await updateConfig(editedConfig).unwrap();
      toast.success("Configuration saved successfully");
      setEditedConfig(null);
    } catch (error) {
      toast.error("Failed to save configuration", {
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleSaveRaw = async () => {
    try {
      await updateRawConfig(editedRaw).unwrap();
      toast.success("Configuration saved successfully");
      setEditedRaw("");
    } catch (error) {
      toast.error("Failed to save configuration", {
        description: getApiErrorMessage(error),
      });
    }
  };

  if (isLoading) {
    return <PageLoading message="Loading configuration..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disk Configuration"
        description="Configure data and parity disks for your SnapRAID array"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visual">Visual Editor</TabsTrigger>
          <TabsTrigger value="raw">Raw Config</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="space-y-6">
          <ParityDisksCard
            parity={currentConfig?.parity ?? []}
            onAdd={handleAddParity}
            onRemove={handleRemoveParity}
            onUpdate={handleUpdateParity}
          />

          <DataDisksCard
            data={currentConfig?.data ?? {}}
            onAdd={handleAddData}
            onRemove={handleRemoveData}
            onUpdate={handleUpdateData}
          />

          <ContentFilesCard
            content={currentConfig?.content ?? []}
            onAdd={handleAddContent}
            onRemove={handleRemoveContent}
            onUpdate={handleUpdateContent}
          />

          <div className="flex justify-end">
            <Button onClick={handleSaveVisual} disabled={!editedConfig}>
              <Save className="h-4 w-4 mr-1" />
              Save Configuration
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="raw">
          <RawConfigEditor value={editedRaw || currentRaw} onChange={setEditedRaw} />

          <div className="flex justify-end mt-4">
            <Button onClick={handleSaveRaw} disabled={!editedRaw}>
              <Save className="h-4 w-4 mr-1" />
              Save Configuration
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
