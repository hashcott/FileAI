"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Send, FileText, MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    id: string;
    content: string;
    score: number;
    metadata: Record<string, any>;
  }>;
}

export default function SearchPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chats, refetch: refetchChats } = trpc.chat.list.useQuery();
  
  const createChatMutation = trpc.chat.create.useMutation({
    onSuccess: (data) => {
      setCurrentChatId(data.id);
      refetchChats();
    },
  });

  const deleteChatMutation = trpc.chat.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
      refetchChats();
      if (currentChatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    },
  });

  // Load chat when selected
  useEffect(() => {
    if (currentChatId) {
      trpc.chat.getById.query({ id: currentChatId }).then((data) => {
        setMessages(data.messages as any);
      });
    }
  }, [currentChatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isStreaming) return;

    // Create new chat if needed
    if (!currentChatId) {
      const chat = await createChatMutation.mutateAsync({
        title: query.substring(0, 50),
      });
      setCurrentChatId(chat.id);
    }

    if (!currentChatId) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: query,
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      // Use non-streaming for now (subscription requires WebSocket setup)
      const result = await trpc.chat.sendMessage.mutate({
        chatId: currentChatId,
        message: query,
        topK: 5,
      });

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.message,
          sources: result.sources as any,
        },
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
  };

  const handleLoadChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleDeleteChat = (chatId: string) => {
    deleteChatMutation.mutate({ id: chatId });
  };

  return (
    <div className="flex h-full">
      {/* Sidebar with chat history */}
      <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto">
        <Button
          onClick={handleNewChat}
          className="w-full mb-4"
          variant="outline"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          New Chat
        </Button>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            Chat History
          </h3>
          {chats?.map((chat) => (
            <div
              key={chat.id}
              className={`group p-2 rounded cursor-pointer hover:bg-gray-100 ${
                currentChatId === chat.id ? "bg-gray-100" : ""
              }`}
            >
              <div
                onClick={() => handleLoadChat(chat.id)}
                className="flex-1"
              >
                <p className="text-sm font-medium truncate">{chat.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  {chat.messageCount} messages
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div className="p-8 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Search Documents</h1>
          <p className="text-gray-600 mt-2">
            Ask questions and get AI-powered answers from your documents
          </p>
        </div>

        <div className="flex-1 overflow-auto p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Search className="h-16 w-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Start a Conversation
              </h2>
              <p className="text-gray-500 max-w-md">
                Ask me anything about your documents. I'll search through them and
                provide answers with citations.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-3xl ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-white border border-gray-200"
                    } rounded-lg p-4`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-gray-700">
                          Sources:
                        </p>
                        {message.sources.map((source, idx) => (
                          <Card key={idx} className="bg-gray-50">
                            <CardHeader className="p-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {source.metadata.filename || "Unknown"}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  Score: {(source.score * 100).toFixed(1)}%
                                </span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                              <p className="text-xs text-gray-600 line-clamp-3">
                                {source.content}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-3xl bg-white border border-gray-200 rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{streamingContent}</p>
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span>
                  </div>
                </div>
              )}

              {isStreaming && !streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-3xl bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your documents..."
                disabled={isStreaming}
                className="flex-1"
              />
              <Button type="submit" disabled={isStreaming || !query.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
