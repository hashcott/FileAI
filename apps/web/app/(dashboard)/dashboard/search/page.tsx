"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Send,
  FileText,
  MessageSquare,
  Trash2,
  Plus,
  Bot,
  User,
  Sparkles,
  X,
  Menu,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { useWebSocket } from "@/lib/use-websocket";

interface Source {
  id?: string;
  content?: string;
  score?: number;
  metadata?: Record<string, any>;
  // Flattened fields (from chat history)
  filename?: string;
  documentId?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function SearchPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // WebSocket integration for real-time chat notifications
  useWebSocket(
    undefined, // No document handler needed here
    (data) => {
      // Handle chat completed notification
      if (data.chatId === currentChatId) {
        toast({
          title: "✅ Response Ready",
          description: `Found ${data.sourcesCount} relevant sources`,
        });
      }
    }
  );

  const { data: chats, refetch: refetchChats } = trpc.chat.list.useQuery();

  const { data: currentChat } = trpc.chat.getById.useQuery(
    { id: currentChatId! },
    { enabled: !!currentChatId }
  );

  const createChatMutation = trpc.chat.create.useMutation({
    onSuccess: (data) => {
      setCurrentChatId(data.id);
      refetchChats();
    },
  });

  const deleteChatMutation = trpc.chat.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Chat deleted" });
      refetchChats();
      if (currentChatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    },
  });

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  useEffect(() => {
    if (currentChat) {
      // Only sync messages from database if we don't have local messages
      // or if the chat has more messages (meaning it was updated externally)
      const dbMessages = currentChat.messages as Message[];
      if (dbMessages.length > messages.length || messages.length === 0) {
        setMessages(dbMessages);
      }
    }
  }, [currentChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isStreaming) return;

    const userQuery = query.trim();
    let chatId = currentChatId;

    // Create chat if needed
    if (!chatId) {
      const chat = await createChatMutation.mutateAsync({
        title: userQuery.substring(0, 50),
      });
      chatId = chat.id;
      setCurrentChatId(chatId);
      // Clear messages when creating new chat
      setMessages([]);
    }

    // Add user message to UI immediately
    const userMessage: Message = { role: "user", content: userQuery };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsStreaming(true);

    try {
      const result = await sendMessageMutation.mutateAsync({
        chatId: chatId!,
        message: userQuery,
        topK: 5,
      });

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.message,
          sources: result.sources as any,
        },
      ]);

      // Refetch chat to sync with database
      refetchChats();

      // Note: WebSocket will handle the notification and sound
      // This toast is just for immediate feedback
      toast({
        title: "Response Generated",
        description: `Found ${result.sources?.length || 0} relevant sources`,
      });
    } catch (error) {
      // Remove user message on error
      setMessages((prev) => prev.filter((msg, idx) =>
        !(msg.role === "user" && msg.content === userQuery && idx === prev.length - 1)
      ));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-1 h-full bg-background/50 backdrop-blur-3xl relative overflow-hidden animate-fadeIn">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-[120px] translate-y-1/2 pointer-events-none" />

      {/* Chat History Sidebar - Premium Glass */}
      <div className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-80 glass border-r border-black/10 dark:border-white/5 flex flex-col transition-all duration-500 ease-in-out shadow-2xl`}>
        <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
          <Button
            onClick={handleNewChat}
            className="flex-1 bg-ai-gradient shadow-ai border-none rounded-2xl h-12 font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Session
          </Button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <p className="text-[10px] font-black text-muted-foreground/40 dark:text-muted-foreground/60 uppercase tracking-[0.2em] mb-4 px-3">
            Neural History
          </p>
          {chats?.length === 0 ? (
            <div className="text-center py-20 px-6 opacity-40">
              <div className="w-16 h-16 rounded-3xl bg-accent flex items-center justify-center mx-auto mb-4 border border-black/5 dark:border-white/5">
                <MessageSquare className="h-8 w-8" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest">Quiet Room</p>
            </div>
          ) : (
            chats?.map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  setCurrentChatId(chat.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`group relative p-4 rounded-[1.25rem] cursor-pointer transition-all duration-300 border ${currentChatId === chat.id
                  ? "bg-primary/10 border-primary/20 shadow-lg shadow-primary/5 ring-1 ring-primary/20"
                  : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className={`h-5 w-5 ${currentChatId === chat.id ? 'text-primary' : 'text-muted-foreground/60'}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`font-bold truncate text-sm mb-1 ${currentChatId === chat.id ? "text-primary" : "text-foreground/80"
                      }`}>
                      {chat.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                        {chat.messageCount} nodes
                      </span>
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                      <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                        {formatDate(chat.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChatMutation.mutate({ id: chat.id });
                    }}
                    className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Experience */}
      <div className="flex-1 flex flex-col relative">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-10 custom-scrollbar relative">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full max-w-5xl mx-auto space-y-12">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-[60px] animate-brain-pulse" />
                <div className="w-32 h-32 rounded-[2.5rem] bg-ai-gradient shadow-ai flex items-center justify-center relative z-10 scale-110">
                  <Sparkles className="h-16 w-16 text-white animate-pulse" />
                </div>
              </div>

              <div className="text-center space-y-4">
                <h2 className="text-4xl font-extrabold tracking-tight">
                  Neural Knowledge Interface
                </h2>
                <p className="text-muted-foreground text-xl max-w-lg mx-auto font-medium opacity-80">
                  Access collective intelligence through conceptual cross-document mapping.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-8">
                {[
                  "Synthesize key operational risks",
                  "Explain core architecture patterns",
                  "Identify cross-document anomalies",
                  "Draft a summary of latest trends"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(suggestion)}
                    className="p-6 text-left glass rounded-3xl border-none shadow-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-base font-bold opacity-80 group-hover:opacity-100 transition-opacity">
                        {suggestion}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto w-full space-y-12 pb-40">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-6 animate-slideUp ${message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${message.role === "assistant"
                    ? "bg-ai-gradient text-white rotate-6"
                    : "bg-accent border border-black/5 dark:border-white/10 text-muted-foreground -rotate-6"
                    }`}>
                    {message.role === "assistant" ? <Bot className="h-6 w-6" /> : <User className="h-6 w-6" />}
                  </div>

                  <div className={`flex-1 space-y-4 ${message.role === "user" ? "text-right" : "text-left"}`}>
                    <div className={`inline-block rounded-[2rem] p-6 text-lg font-medium leading-relaxed shadow-2xl relative overflow-hidden ${message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "glass rounded-tl-none pr-8"
                      }`}>
                      {message.role === "assistant" && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-ai-gradient opacity-50" />
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-6 space-y-4 max-w-2xl">
                        <div className="flex items-center gap-3 px-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verification Sources</span>
                          <div className="h-px flex-1 bg-black/5 dark:bg-white/5" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {message.sources.slice(0, 4).map((source, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl glass border-none shadow-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-default group"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  {((source.score || 0) * 100).toFixed(0)}% MATCH
                                </span>
                              </div>
                              <p className="text-[10px] font-black uppercase text-muted-foreground/60 truncate mb-1">
                                {source.metadata?.filename || source.filename || "Asset Artifact"}
                              </p>
                              <p className="text-xs text-foreground/70 line-clamp-2 italic leading-relaxed">
                                "{source.content}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && (
                <div className="flex gap-6 animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-ai-gradient flex items-center justify-center text-white rotate-6">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div className="flex-1 pt-3">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '200ms' }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '400ms' }} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-primary">Synthesizing Neural Response...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-10" />
            </div>
          )}
        </div>

        {/* Input Dock */}
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 pb-6 sm:pb-8 pointer-events-none">
          <div className="max-w-6xl mx-auto pointer-events-auto">
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute -inset-1 bg-ai-gradient rounded-[2.5rem] blur opacity-10 group-focus-within:opacity-40 transition-opacity duration-500" />
              <div className="relative glass rounded-[2.5rem] p-2 flex items-center gap-2 border-black/5 dark:border-white/10 shadow-3xl">
                <div className="pl-6 text-primary flex-shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Inquire about your document ecosystem..."
                  disabled={isStreaming}
                  className="bg-transparent border-none focus-visible:ring-0 text-lg h-16 placeholder:text-muted-foreground/40 font-medium"
                />
                <Button
                  type="submit"
                  disabled={isStreaming || !query.trim()}
                  className="bg-ai-gradient rounded-[2rem] w-14 h-14 shadow-ai border-none hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                >
                  <Send className="h-6 w-6" />
                </Button>
              </div>
              <p className="text-[10px] text-center mt-3 font-black uppercase tracking-[0.3em] text-muted-foreground/30 px-4">
                AI can hallucinate. Verify critical insights with primary sources.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Trigger */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed left-6 top-1/2 -translate-y-1/2 z-40 p-3 glass text-primary rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all border border-black/5 dark:border-white/5"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
