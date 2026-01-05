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
    <div className="flex h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] animate-fadeIn relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat History Sidebar - Mobile Optimized */}
      <div className={`${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-200`}>
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <Button
            onClick={handleNewChat}
            className="flex-1 gradient-primary border-0 touch-manipulation"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">New Conversation</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">
            Recent Chats
          </p>
          {chats?.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-base font-medium text-slate-600 dark:text-slate-300 mb-1">No conversations yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Start a new chat to begin</p>
            </div>
          )}
          {chats?.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setCurrentChatId(chat.id);
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              className={`group p-3 rounded-lg cursor-pointer transition-all touch-manipulation ${
                currentChatId === chat.id
                  ? "bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 shadow-sm"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate text-base mb-1 ${
                    currentChatId === chat.id
                      ? "text-primary dark:text-primary-foreground"
                      : "text-slate-800 dark:text-white"
                  }`}>
                    {chat.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {chat.messageCount} {chat.messageCount === 1 ? "message" : "messages"}
                    </p>
                    {chat.updatedAt && (
                      <span className="text-sm text-slate-400 dark:text-slate-500">
                        • {formatDate(chat.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChatMutation.mutate({ id: chat.id });
                  }}
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 relative">
        {/* Mobile Sidebar Toggle - Floating Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed bottom-28 sm:bottom-32 right-4 z-30 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 touch-manipulation"
            aria-label="Open chat history"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mb-6">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-3 px-4">
                Ask anything about your documents
              </h2>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 text-center max-w-md mb-8 px-4">
                I'll search through your uploaded documents and provide answers with citations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl px-4">
                {[
                  "What are the key findings in my reports?",
                  "Summarize the main topics covered",
                  "Find information about specific topics",
                  "Compare data across documents",
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(suggestion)}
                    className="p-4 text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors touch-manipulation"
                  >
                    <p className="text-base text-slate-700 dark:text-slate-200">
                      {suggestion}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 sm:gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[85%] sm:max-w-2xl rounded-2xl p-4 sm:p-5 shadow-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <p className={`whitespace-pre-wrap leading-relaxed text-base sm:text-base ${
                      message.role === "user" 
                        ? "text-primary-foreground" 
                        : "text-slate-800 dark:text-slate-100"
                    }`}>
                      {message.content}
                    </p>
                    
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-600/50">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Sources ({message.sources.length})
                        </p>
                        <div className="space-y-2.5">
                          {message.sources.slice(0, 3).map((source, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200/50 dark:border-slate-600/50 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
                            >
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0">
                                  {source.metadata?.filename || source.filename || "Unknown file"}
                                </span>
                                <span className="text-xs sm:text-sm px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium flex-shrink-0">
                                  {((source.score || 0) * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                {source.content || "No content available"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && (
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                      <span className="text-base text-slate-500 dark:text-slate-400">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input - Mobile Optimized */}
        <div className="p-4 sm:p-5 lg:p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your documents..."
                disabled={isStreaming}
                className="pr-12 sm:pr-14 py-4 sm:py-5 text-base rounded-xl border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50 dark:bg-slate-900"
              />
              <Button
                type="submit"
                disabled={isStreaming || !query.trim()}
                className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground hover:bg-primary/90 border-0 rounded-lg touch-manipulation shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
