"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState({
    database: { url: "mongodb://localhost:27017/fileai" },
    storage: {
      type: "local" as "s3" | "local" | "minio",
      config: {
        localPath: "./uploads",
      },
    },
    vectorDB: {
      type: "qdrant" as "qdrant" | "meilisearch" | "mongodb",
      config: {
        url: "http://localhost:6333",
        collectionName: "documents",
      },
    },
    llm: {
      provider: "ollama" as "ollama" | "openai",
      model: "llama3",
      baseUrl: "http://localhost:11434",
      temperature: 0.7,
    },
    embedding: {
      provider: "ollama" as "ollama" | "openai",
      model: "nomic-embed-text",
      baseUrl: "http://localhost:11434",
    },
  });

  const saveMutation = trpc.config.save.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Configuration saved successfully",
      });
      router.push("/register");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFinish = () => {
    saveMutation.mutate(config as Parameters<typeof saveMutation.mutate>[0]);
  };

  const steps = [
    {
      title: "Database",
      description: "Configure MongoDB connection",
    },
    {
      title: "Storage",
      description: "Choose file storage method",
    },
    {
      title: "Vector DB",
      description: "Configure vector database",
    },
    {
      title: "LLM",
      description: "Choose language model",
    },
    {
      title: "Embeddings",
      description: "Choose embedding model",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to FileAI
          </h1>
          <p className="text-gray-600">Let&apos;s set up your system</p>
        </div>

        {/* Progress steps */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center flex-1"
              onClick={() => setCurrentStep(index)}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 cursor-pointer ${
                  index <= currentStep
                    ? "bg-primary text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <p className="text-xs text-center font-medium">{step.title}</p>
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
                    onValueChange={(value: "s3" | "local" | "minio") =>
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

                {config.storage.type === "local" && (
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
                    onValueChange={(value: "qdrant" | "meilisearch" | "mongodb") =>
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
                    onValueChange={(value: "ollama" | "openai") =>
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
                      config.llm.provider === "ollama"
                        ? "llama3"
                        : "gpt-4-turbo-preview"
                    }
                  />
                </div>

                {config.llm.provider === "ollama" && (
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
                    onValueChange={(value: "ollama" | "openai") =>
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
                      config.embedding.provider === "ollama"
                        ? "nomic-embed-text"
                        : "text-embedding-3-small"
                    }
                  />
                </div>

                {config.embedding.provider === "ollama" && (
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
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          {currentStep === steps.length - 1 ? (
            <Button onClick={handleFinish} disabled={saveMutation.isLoading}>
              {saveMutation.isLoading ? "Saving..." : "Finish Setup"}
            </Button>
          ) : (
            <Button
              onClick={() =>
                setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
              }
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

