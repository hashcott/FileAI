'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useAuthStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);
  const { data: initData, isLoading: initLoading } = trpc.config.isInitialized.useQuery();

  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [config, setConfig] = useState({
    database: { url: 'mongodb://localhost:27017/fileai' },
    storage: {
      type: 'local' as 's3' | 'local' | 'minio',
      config: {
        localPath: './uploads',
      },
    },
    vectorDB: {
      type: 'qdrant' as 'qdrant' | 'meilisearch' | 'mongodb',
      config: {
        url: 'http://localhost:6333',
        collectionName: 'documents',
      },
    },
    llm: {
      provider: 'ollama' as 'ollama' | 'openai',
      model: 'llama3',
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
    },
    embedding: {
      provider: 'ollama' as 'ollama' | 'openai',
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    },
  });

  const saveMutation = trpc.config.save.useMutation({
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const setupAdminMutation = trpc.auth.setupAdmin.useMutation({
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast({
        title: 'Success',
        description: 'Admin account created successfully',
      });
      router.push('/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Redirect if already initialized
  useEffect(() => {
    if (!initLoading) {
      if (initData?.isInitialized) {
        router.push('/dashboard');
      } else {
        // If not initialized, ensure we are logged out to prevent stale auth issues
        logout();
      }
    }
  }, [initData, initLoading, router, logout]);

  // Show loading state while checking initialization
  if (initLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render setup if already initialized (will redirect)
  if (initData?.isInitialized) {
    return null;
  }

  const handleFinish = async () => {
    // If on config step (step 4), save config and move to admin creation
    if (currentStep === 4) {
      try {
        await saveMutation.mutateAsync(config as Parameters<typeof saveMutation.mutate>[0]);
        setCurrentStep(5); // Move to admin creation step
      } catch {
        // Error already handled in mutation
      }
    } else if (currentStep === 5) {
      // Create admin user
      if (!adminData.email || !adminData.password) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
      setupAdminMutation.mutate({
        email: adminData.email,
        password: adminData.password,
        name: adminData.name || undefined,
      });
    }
  };

  const steps = [
    {
      title: 'Database',
      description: 'Configure MongoDB connection',
    },
    {
      title: 'Storage',
      description: 'Choose file storage method',
    },
    {
      title: 'Vector DB',
      description: 'Configure vector database',
    },
    {
      title: 'LLM',
      description: 'Choose language model',
    },
    {
      title: 'Embeddings',
      description: 'Choose embedding model',
    },
    {
      title: 'Admin Account',
      description: 'Create your admin account',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Welcome to FileAI</h1>
          <p className="text-gray-600">Let&apos;s set up your system</p>
        </div>

        {/* Progress steps */}
        <div className="mb-8 flex justify-between">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-1 flex-col items-center"
              onClick={() => setCurrentStep(index)}
            >
              <div
                className={`mb-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full ${
                  index <= currentStep ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'
                }`}
              >
                {index < currentStep ? <CheckCircle className="h-5 w-5" /> : index + 1}
              </div>
              <p className="text-center text-xs font-medium">{step.title}</p>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 0: Database */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mongodbUrl">MongoDB URL</Label>
                  <Input
                    id="mongodbUrl"
                    value={config.database.url}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        database: { url: e.target.value },
                      })
                    }
                    placeholder="mongodb://localhost:27017/fileai"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Storage */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="storageType">Storage Type</Label>
                  <Select
                    value={config.storage.type}
                    onValueChange={(value: 's3' | 'local' | 'minio') =>
                      setConfig({
                        ...config,
                        storage: { ...config.storage, type: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Storage</SelectItem>
                      <SelectItem value="s3">Amazon S3</SelectItem>
                      <SelectItem value="minio">MinIO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.storage.type === 'local' && (
                  <div>
                    <Label htmlFor="localPath">Local Path</Label>
                    <Input
                      id="localPath"
                      value={config.storage.config.localPath}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          storage: {
                            ...config.storage,
                            config: { localPath: e.target.value },
                          },
                        })
                      }
                      placeholder="./uploads"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Vector DB */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vectorType">Vector Database</Label>
                  <Select
                    value={config.vectorDB.type}
                    onValueChange={(value: 'qdrant' | 'meilisearch' | 'mongodb') =>
                      setConfig({
                        ...config,
                        vectorDB: { ...config.vectorDB, type: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qdrant">Qdrant</SelectItem>
                      <SelectItem value="meilisearch">Meilisearch</SelectItem>
                      <SelectItem value="mongodb">MongoDB Vector</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="vectorUrl">Vector DB URL</Label>
                  <Input
                    id="vectorUrl"
                    value={config.vectorDB.config.url}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        vectorDB: {
                          ...config.vectorDB,
                          config: {
                            ...config.vectorDB.config,
                            url: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="http://localhost:6333"
                  />
                </div>

                <div>
                  <Label htmlFor="collectionName">Collection Name</Label>
                  <Input
                    id="collectionName"
                    value={config.vectorDB.config.collectionName}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        vectorDB: {
                          ...config.vectorDB,
                          config: {
                            ...config.vectorDB.config,
                            collectionName: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="documents"
                  />
                </div>
              </div>
            )}

            {/* Step 3: LLM */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="llmProvider">Provider</Label>
                  <Select
                    value={config.llm.provider}
                    onValueChange={(value: 'ollama' | 'openai') =>
                      setConfig({
                        ...config,
                        llm: { ...config.llm, provider: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ollama">Ollama (Local)</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="llmModel">Model</Label>
                  <Input
                    id="llmModel"
                    value={config.llm.model}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        llm: { ...config.llm, model: e.target.value },
                      })
                    }
                    placeholder={
                      config.llm.provider === 'ollama' ? 'llama3' : 'gpt-4-turbo-preview'
                    }
                  />
                </div>

                {config.llm.provider === 'ollama' && (
                  <div>
                    <Label htmlFor="llmBaseUrl">Base URL</Label>
                    <Input
                      id="llmBaseUrl"
                      value={config.llm.baseUrl}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          llm: { ...config.llm, baseUrl: e.target.value },
                        })
                      }
                      placeholder="http://localhost:11434"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Embeddings */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="embeddingProvider">Provider</Label>
                  <Select
                    value={config.embedding.provider}
                    onValueChange={(value: 'ollama' | 'openai') =>
                      setConfig({
                        ...config,
                        embedding: { ...config.embedding, provider: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ollama">Ollama (Local)</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="embeddingModel">Model</Label>
                  <Input
                    id="embeddingModel"
                    value={config.embedding.model}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        embedding: { ...config.embedding, model: e.target.value },
                      })
                    }
                    placeholder={
                      config.embedding.provider === 'ollama'
                        ? 'nomic-embed-text'
                        : 'text-embedding-3-small'
                    }
                  />
                </div>

                {config.embedding.provider === 'ollama' && (
                  <div>
                    <Label htmlFor="embeddingBaseUrl">Base URL</Label>
                    <Input
                      id="embeddingBaseUrl"
                      value={config.embedding.baseUrl}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          embedding: {
                            ...config.embedding,
                            baseUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="http://localhost:11434"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Admin Account */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-medium">Create your admin account</p>
                  <p className="mt-1 text-blue-600">
                    This will be the first user with administrator privileges. You can create
                    organizations and manage the system.
                  </p>
                </div>

                <div>
                  <Label htmlFor="adminName">Full Name (Optional)</Label>
                  <div className="relative">
                    <User className="text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
                    <Input
                      id="adminName"
                      type="text"
                      placeholder="John Doe"
                      value={adminData.name}
                      onChange={(e) =>
                        setAdminData({ ...adminData, name: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="adminEmail">Email *</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@example.com"
                      value={adminData.email}
                      onChange={(e) =>
                        setAdminData({ ...adminData, email: e.target.value })
                      }
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="adminPassword">Password *</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
                    <Input
                      id="adminPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={adminData.password}
                      onChange={(e) =>
                        setAdminData({ ...adminData, password: e.target.value })
                      }
                      required
                      minLength={8}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Password must be at least 8 characters
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleFinish}
              disabled={setupAdminMutation.isPending || saveMutation.isPending}
            >
              {setupAdminMutation.isPending
                ? 'Creating Admin...'
                : saveMutation.isPending
                  ? 'Saving...'
                  : 'Create Admin Account'}
            </Button>
          ) : currentStep === steps.length - 2 ? (
            <Button onClick={handleFinish} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save & Continue'}  
            </Button>
          ) : (
            <Button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
