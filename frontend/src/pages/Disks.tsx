import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useGetConfigQuery,
  useGetRawConfigQuery,
  useUpdateConfigMutation,
  useUpdateRawConfigMutation,
} from "@/store/api";
import { Plus, Trash2, Save, HardDrive, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { ParsedSnapRaidConfig } from "@shared/types";

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

  // Initialize edited state when config loads
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
    const newName = `d${Object.keys(currentConfig.data).length + 1}`;
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
      toast({ title: "Configuration saved successfully" });
      setEditedConfig(null);
    } catch (error) {
      toast({
        title: "Failed to save configuration",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleSaveRaw = async () => {
    try {
      await updateRawConfig(editedRaw).unwrap();
      toast({ title: "Configuration saved successfully" });
      setEditedRaw("");
    } catch (error) {
      toast({
        title: "Failed to save configuration",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Disk Configuration
        </h1>
        <p className="text-muted-foreground">
          Configure data and parity disks for your SnapRAID array
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visual">Visual Editor</TabsTrigger>
          <TabsTrigger value="raw">Raw Config</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="space-y-6">
          {/* Parity Disks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Parity Disks
                  </CardTitle>
                  <CardDescription>
                    Parity files store redundancy data for recovery
                  </CardDescription>
                </div>
                <Button onClick={handleAddParity} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Parity
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentConfig?.parity.map((path, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="outline" className="w-20 justify-center">
                      {index === 0 ? "parity" : `${index + 1}-parity`}
                    </Badge>
                    <Input
                      value={path}
                      onChange={(e) =>
                        handleUpdateParity(index, e.target.value)
                      }
                      placeholder="/mnt/parity/snapraid.parity"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveParity(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {(!currentConfig?.parity ||
                  currentConfig.parity.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No parity disks configured. Add at least one parity disk.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Disks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Data Disks
                  </CardTitle>
                  <CardDescription>
                    Data disks contain the files you want to protect
                  </CardDescription>
                </div>
                <Button onClick={handleAddData} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Disk
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentConfig?.data &&
                  Object.entries(currentConfig.data).map(([name, path]) => (
                    <div key={name} className="flex items-center gap-2">
                      <Input
                        value={name}
                        onChange={(e) =>
                          handleUpdateData(name, e.target.value, path)
                        }
                        placeholder="d1"
                        className="w-24"
                      />
                      <Input
                        value={path}
                        onChange={(e) =>
                          handleUpdateData(name, name, e.target.value)
                        }
                        placeholder="/mnt/disk1/"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveData(name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                {(!currentConfig?.data ||
                  Object.keys(currentConfig.data).length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No data disks configured. Add at least one data disk.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Content Files</CardTitle>
                  <CardDescription>
                    Content files store the list of files and their checksums
                  </CardDescription>
                </div>
                <Button onClick={handleAddContent} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentConfig?.content.map((path, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={path}
                      onChange={(e) =>
                        handleUpdateContent(index, e.target.value)
                      }
                      placeholder="/mnt/disk1/snapraid.content"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveContent(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {(!currentConfig?.content ||
                  currentConfig.content.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No content files configured. Add at least two for
                    redundancy.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveVisual} disabled={!editedConfig}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Raw Configuration</CardTitle>
              <CardDescription>
                Edit the snapraid.conf file directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full rounded border">
                <textarea
                  value={editedRaw || currentRaw}
                  onChange={(e) => setEditedRaw(e.target.value)}
                  className="w-full h-full min-h-[500px] p-4 font-mono text-sm bg-background resize-none focus:outline-none"
                  spellCheck={false}
                />
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex justify-end mt-4">
            <Button onClick={handleSaveRaw} disabled={!editedRaw}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
