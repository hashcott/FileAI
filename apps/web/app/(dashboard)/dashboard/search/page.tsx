"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
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
import { useChatStore, useUIStore, useWebSocketStore } from "@/lib/stores";

interface Source {
    id?: string;
    content?: string;
    score?: number;
    metadata?: Record<string, unknown>;
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const shouldScrollRef = useRef(false);
    const prevMessagesLengthRef = useRef(0);

    // Zustand stores
    const query = useChatStore((state) => state.query);
    const setQuery = useChatStore((state) => state.setQuery);
    const messages = useChatStore((state) => state.messages);
    const setMessages = useChatStore((state) => state.setMessages);
    const addMessage = useChatStore((state) => state.addMessage);
    const isStreaming = useChatStore((state) => state.isStreaming);
    const setIsStreaming = useChatStore((state) => state.setIsStreaming);
    const currentChatId = useChatStore((state) => state.currentChatId);
    const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);
    const resetChat = useChatStore((state) => state.reset);

    const sidebarOpen = useUIStore((state) => state.sidebarOpen);
    const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

    const setChatHandler = useWebSocketStore((state) => state.setChatHandler);

    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        }
    }, []);

    useEffect(() => {
        setChatHandler((data) => {
            if (data.chatId === currentChatId) {
                toast({
                    title: "Response Ready",
                    description: `Found ${data.sourcesCount} relevant sources`,
                });
            }
        });
    }, [currentChatId, setChatHandler, toast]);

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
                resetChat();
            }
        },
    });

    const sendMessageMutation = trpc.chat.sendMessage.useMutation();

    useEffect(() => {
        if (currentChat) {
            const dbMessages = currentChat.messages as Message[];
            if (dbMessages.length > messages.length || messages.length === 0) {
                setMessages(dbMessages);
                prevMessagesLengthRef.current = dbMessages.length;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentChat]);

    useEffect(() => {
        if (
            messages.length > prevMessagesLengthRef.current &&
            shouldScrollRef.current
        ) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        prevMessagesLengthRef.current = messages.length;
        shouldScrollRef.current = false;
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isStreaming) return;

        const userQuery = query.trim();
        let chatId = currentChatId;

        if (!chatId) {
            const chat = await createChatMutation.mutateAsync({
                title: userQuery.substring(0, 50),
            });
            chatId = chat.id;
            setCurrentChatId(chatId);
            setMessages([]);
        }

        const userMessage: Message = { role: "user", content: userQuery };
        shouldScrollRef.current = true;
        addMessage(userMessage);
        setQuery("");
        setIsStreaming(true);

        try {
            const result = await sendMessageMutation.mutateAsync({
                chatId: chatId!,
                message: userQuery,
                topK: 5,
            });

            shouldScrollRef.current = true;
            addMessage({
                role: "assistant",
                content: result.message,
                sources: result.sources as Source[],
            });

            refetchChats();

            toast({
                title: "Response Generated",
                description: `Found ${
                    result.sources?.length || 0
                } relevant sources`,
            });
        } catch (error) {
            const currentMessages = useChatStore.getState().messages;
            const filteredMessages = currentMessages.filter(
                (msg, idx) =>
                    !(
                        msg.role === "user" &&
                        msg.content === userQuery &&
                        idx === currentMessages.length - 1
                    )
            );
            setMessages(filteredMessages);
            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to send message",
                variant: "destructive",
            });
        } finally {
            setIsStreaming(false);
        }
    };

    const handleNewChat = () => {
        resetChat();
    };

    return (
        <div className="flex flex-1 h-full bg-background relative overflow-hidden">
            {/* Chat History Sidebar */}
            <div
                className={`${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-200`}
            >
                <div className="p-4 border-b border-border flex items-center gap-2">
                    <Button
                        onClick={handleNewChat}
                        className="flex-1 bg-primary hover:bg-primary/90 rounded-lg h-10 font-medium"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Chat
                    </Button>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    <p className="text-xs font-medium text-muted-foreground px-2 py-2">
                        Chat History
                    </p>
                    {chats?.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mx-auto mb-3">
                                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                No chats yet
                            </p>
                        </div>
                    ) : (
                        chats?.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => {
                                    setCurrentChatId(chat.id);
                                    if (window.innerWidth < 1024)
                                        setSidebarOpen(false);
                                }}
                                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                                    currentChatId === chat.id
                                        ? "bg-primary/10 border border-primary/20"
                                        : "hover:bg-accent border border-transparent"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={`font-medium text-sm truncate ${
                                                currentChatId === chat.id
                                                    ? "text-primary"
                                                    : ""
                                            }`}
                                        >
                                            {chat.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-muted-foreground">
                                                {chat.messageCount} messages
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(chat.updatedAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteChatMutation.mutate({
                                                id: chat.id,
                                            });
                                        }}
                                        className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-full max-w-2xl mx-auto space-y-8">
                            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
                                <Sparkles className="h-10 w-10 text-primary-foreground" />
                            </div>

                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-semibold">
                                    Chat with your documents
                                </h2>
                                <p className="text-muted-foreground">
                                    Ask questions about your uploaded files and
                                    get AI-powered answers.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                                {[
                                    "Summarize the key points",
                                    "What are the main risks?",
                                    "Explain the technical details",
                                    "Find relevant sections",
                                ].map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setQuery(suggestion)}
                                        className="p-4 text-left bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                                    >
                                        <p className="text-sm font-medium">
                                            {suggestion}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto w-full space-y-6 pb-32">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-4 ${
                                        message.role === "user"
                                            ? "flex-row-reverse"
                                            : "flex-row"
                                    }`}
                                >
                                    <div
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            message.role === "assistant"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-accent text-muted-foreground"
                                        }`}
                                    >
                                        {message.role === "assistant" ? (
                                            <Bot className="h-5 w-5" />
                                        ) : (
                                            <User className="h-5 w-5" />
                                        )}
                                    </div>

                                    <div
                                        className={`flex-1 space-y-3 ${
                                            message.role === "user"
                                                ? "text-right"
                                                : "text-left"
                                        }`}
                                    >
                                        <div
                                            className={`inline-block rounded-xl p-4 max-w-[85%] ${
                                                message.role === "user"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-card border border-border"
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap text-sm">
                                                {message.content}
                                            </p>
                                        </div>

                                        {message.sources &&
                                            message.sources.length > 0 && (
                                                <div className="mt-4 space-y-2 max-w-xl">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-primary" />
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            Sources
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {message.sources
                                                            .slice(0, 4)
                                                            .map(
                                                                (
                                                                    source,
                                                                    idx
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="p-3 rounded-lg bg-accent border border-border"
                                                                    >
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <FileText className="h-3.5 w-3.5 text-primary" />
                                                                            <span className="text-xs font-medium text-chart-2">
                                                                                {(
                                                                                    (source.score ||
                                                                                        0) *
                                                                                    100
                                                                                ).toFixed(
                                                                                    0
                                                                                )}

                                                                                %
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground truncate mb-1">
                                                                            {(source
                                                                                .metadata
                                                                                ?.filename as string) ||
                                                                                source.filename ||
                                                                                "Document"}
                                                                        </p>
                                                                        <p className="text-xs line-clamp-2">
                                                                            {
                                                                                source.content
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                )
                                                            )}
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            ))}

                            {isStreaming && (
                                <div className="flex gap-4">
                                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                                        <Bot className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 pt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <div
                                                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                                                    style={{
                                                        animationDelay: "0ms",
                                                    }}
                                                />
                                                <div
                                                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                                                    style={{
                                                        animationDelay: "150ms",
                                                    }}
                                                />
                                                <div
                                                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                                                    style={{
                                                        animationDelay: "300ms",
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                Generating response...
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-4" />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-background border-t border-border">
                    <div className="max-w-4xl mx-auto">
                        <form
                            onSubmit={handleSubmit}
                            className="flex items-center gap-3"
                        >
                            <div className="flex-1 relative">
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Ask a question about your documents..."
                                    disabled={isStreaming}
                                    className="bg-accent border-border h-12 pr-12 rounded-lg"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isStreaming || !query.trim()}
                                className="bg-primary rounded-lg h-12 w-12"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </form>
                        <p className="text-xs text-center mt-2 text-muted-foreground">
                            AI responses may contain errors. Verify important
                            information.
                        </p>
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar Toggle */}
            {!sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden fixed left-4 top-1/2 -translate-y-1/2 z-40 p-2 bg-card border border-border text-primary rounded-lg shadow-sm"
                >
                    <Menu className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}
