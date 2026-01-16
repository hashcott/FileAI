'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, HardDrive, Bot, Key, Save, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: 'Settings saved',
      description: 'Your configuration has been updated.',
    });
  };

  return (
    <div className="custom-scrollbar mx-auto h-full max-w-4xl space-y-6 overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure your FileAI system settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary h-9 rounded-lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 gap-2 md:grid-cols-4 h-auto bg-accent border-border rounded-lg border p-1">
          <TabsTrigger
            value="database"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
          >
            <Database className="mr-2 h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger
            value="storage"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
          >
            <HardDrive className="mr-2 h-4 w-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger
            value="llm"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
          >
            <Bot className="mr-2 h-4 w-4" />
            LLM
          </TabsTrigger>
          <TabsTrigger
            value="api"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
          >
            <Key className="mr-2 h-4 w-4" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="text-primary h-5 w-5" />
                Database Configuration
              </CardTitle>
              <CardDescription>Configure MongoDB and Qdrant connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mongodb">MongoDB URI</Label>
                <div className="flex gap-2">
                  <Input
                    id="mongodb"
                    defaultValue="mongodb://localhost:27017/fileai"
                    className="bg-accent border-border font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" className="border-border">
                    <CheckCircle className="text-chart-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qdrant">Qdrant URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="qdrant"
                    defaultValue="http://localhost:6333"
                    className="bg-accent border-border font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" className="border-border">
                    <CheckCircle className="text-chart-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection">Collection Name</Label>
                <Input
                  id="collection"
                  defaultValue="documents"
                  className="bg-accent border-border"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HardDrive className="text-primary h-5 w-5" />
                Storage Configuration
              </CardTitle>
              <CardDescription>Configure file storage settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Storage Type</Label>
                <Select defaultValue="local">
                  <SelectTrigger className="bg-accent border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="local">Local Storage</SelectItem>
                    <SelectItem value="s3">Amazon S3</SelectItem>
                    <SelectItem value="minio">MinIO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storagePath">Storage Path</Label>
                <Input
                  id="storagePath"
                  defaultValue="./uploads"
                  className="bg-accent border-border"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="text-primary h-5 w-5" />
                LLM Configuration
              </CardTitle>
              <CardDescription>Configure language model settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Chat Model</h4>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select defaultValue="ollama">
                      <SelectTrigger className="bg-accent border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="ollama">Ollama (Local)</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input defaultValue="llama3" className="bg-accent border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input
                      defaultValue="http://localhost:11434"
                      className="bg-accent border-border"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Embedding Model</h4>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select defaultValue="ollama">
                      <SelectTrigger className="bg-accent border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="ollama">Ollama (Local)</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input defaultValue="nomic-embed-text" className="bg-accent border-border" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="text-primary h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>Manage your API keys for external services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai">OpenAI API Key</Label>
                <Input
                  id="openai"
                  type="password"
                  placeholder="sk-..."
                  className="bg-accent border-border font-mono"
                />
                <p className="text-muted-foreground text-xs">
                  Required if using OpenAI for chat or embeddings
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qdrantKey">Qdrant API Key</Label>
                <Input
                  id="qdrantKey"
                  type="password"
                  placeholder="Optional for cloud Qdrant"
                  className="bg-accent border-border font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
