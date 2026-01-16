'use client';

import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import { FilePreviewDialog } from '@/components/ui/file-preview-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { useChatStore, useUIStore, useWebSocketStore } from '@/lib/stores';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface Source {
  id?: string;
  content?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  filename?: string;
  documentId?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md bg-zinc-700/50 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

/**
 * Parse message content and convert [Source X] references to clickable links
 * Renders markdown and code blocks
 */
function MessageContent({
  content,
  sources,
  onSourceClick,
}: {
  content: string;
  sources?: Source[];
  onSourceClick: (source: Source) => void;
}) {
  // Preprocess content to convert [Source X] to markdown links
  const processedContent = content.replace(
    /\[Source\s*(\d+)\]/gi,
    (_, id) => `[[Source ${id}]](source:${id})`
  );

  return (
    <div className="text-sm break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-md font-bold mb-2">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/50 pl-4 italic mb-2">
            {children}
          </blockquote>
        ),
        a: ({ href, children, ...props }) => {
          if (href?.startsWith('source:')) {
            const sourceId = parseInt(href.split(':')[1], 10);
            const source = sources?.[sourceId - 1];
            
            // If source is invalid/missing, just render text
            if (!source) return <span>[Source {sourceId}]</span>;

            const filename = (source.metadata?.filename as string) || source.filename || 'Document';

            return (
              <button
                onClick={() => onSourceClick(source)}
                className="bg-primary/10 text-primary hover:bg-primary/20 mx-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors align-middle"
                title={`Click to view: ${filename}`}
              >
                <FileText className="h-3 w-3" />
                Source {sourceId}
              </button>
            );
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              {...props}
            >
              {children}
            </a>
          );
        },
        code({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'>) {
          const inline = !className?.includes('language-');
          const match = /language-(\w+)/.exec(className || '');
          
          if (inline || !match) {
            return (
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
                {children}
              </code>
            );
          }

          return (
            <div className="relative group my-2 rounded-lg overflow-x-auto">
              <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton content={String(children).replace(/\n$/, '')} />
              </div>
              <SyntaxHighlighter
                style={vscDarkPlus as any}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          );
        },
      }}
    >
      {processedContent}
    </ReactMarkdown>
    </div>
  );
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

  // File preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    filename: string;
    mimeType: string;
  } | null>(null);

  const handlePreview = (source: Source) => {
    const docId = source.documentId || (source.metadata?.documentId as string);
    const filename = (source.metadata?.filename as string) || source.filename || 'Document';
    const mimeType = (source.metadata?.mimeType as string) || 'application/pdf';

    if (docId) {
      setPreviewFile({ id: docId, filename, mimeType });
      setPreviewOpen(true);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    setChatHandler((data) => {
      if (data.chatId === currentChatId) {
        toast({
          title: 'Response Ready',
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
      toast({ title: 'Chat deleted' });
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
    if (messages.length > prevMessagesLengthRef.current && shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    const userMessage: Message = { role: 'user', content: userQuery };
    shouldScrollRef.current = true;
    addMessage(userMessage);
    setQuery('');
    setIsStreaming(true);

    try {
      const result = await sendMessageMutation.mutateAsync({
        chatId: chatId!,
        message: userQuery,
        topK: 5,
      });

      shouldScrollRef.current = true;
      addMessage({
        role: 'assistant',
        content: result.message,
        sources: result.sources as Source[],
      });

      refetchChats();

      toast({
        title: 'Response Generated',
        description: `Found ${result.sources?.length || 0} relevant sources`,
      });
    } catch (error) {
      const currentMessages = useChatStore.getState().messages;
      const filteredMessages = currentMessages.filter(
        (msg, idx) =>
          !(msg.role === 'user' && msg.content === userQuery && idx === currentMessages.length - 1)
      );
      setMessages(filteredMessages);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    resetChat();
  };

  return (
    <div className="bg-background relative flex h-full flex-1 overflow-hidden">
      {/* Chat History Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-card border-border fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r transition-transform duration-200 lg:static lg:translate-x-0`}
      >
        <div className="border-border flex items-center gap-2 border-b p-4">
          <Button
            onClick={handleNewChat}
            className="bg-primary hover:bg-primary/90 h-10 flex-1 rounded-lg font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="hover:bg-accent text-muted-foreground rounded-lg p-2 transition-colors lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
          <p className="text-muted-foreground px-2 py-2 text-xs font-medium">Chat History</p>
          {chats?.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="bg-accent mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg">
                <MessageSquare className="text-muted-foreground h-6 w-6" />
              </div>
              <p className="text-muted-foreground text-sm">No chats yet</p>
            </div>
          ) : (
            chats?.map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  setCurrentChatId(chat.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`group relative cursor-pointer rounded-lg p-3 transition-colors ${
                  currentChatId === chat.id
                    ? 'bg-primary/10 border-primary/20 border'
                    : 'hover:bg-accent border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        currentChatId === chat.id ? 'text-primary' : ''
                      }`}
                    >
                      {chat.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {chat.messageCount} messages
                      </span>
                      <span className="text-muted-foreground text-xs">
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
                    className="hover:bg-destructive/10 hover:text-destructive h-7 w-7 rounded-md opacity-0 transition-all group-hover:opacity-100"
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
      <div className="relative flex flex-1 flex-col h-full overflow-hidden">
        {/* Messages */}
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4 md:p-6 min-h-0">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center space-y-8">
              <div className="bg-primary flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl">
                <Sparkles className="text-primary-foreground h-8 w-8 md:h-10 md:w-10" />
              </div>

              <div className="space-y-2 text-center px-4">
                <h2 className="text-xl md:text-2xl font-semibold">Chat with your documents</h2>
                <p className="text-muted-foreground text-sm md:text-base">
                  Ask questions about your uploaded files and get AI-powered answers.
                </p>
              </div>

              <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2 px-4">
                {[
                  'Summarize the key points',
                  'What are the main risks?',
                  'Explain the technical details',
                  'Find relevant sections',
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(suggestion)}
                    className="bg-card border-border hover:border-primary/30 rounded-lg border p-4 text-left transition-colors"
                  >
                    <p className="text-sm font-medium">{suggestion}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-4xl space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 md:gap-4 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 md:h-9 md:w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                      message.role === 'assistant'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-muted-foreground'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <Bot className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      <User className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </div>

                  <div
                    className={`flex-1 space-y-3 min-w-0 ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`w-fit max-w-[95%] md:max-w-[95%] rounded-xl p-3 md:p-4 text-left ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-card border-border border'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <MessageContent
                          content={message.content}
                          sources={message.sources}
                          onSourceClick={handlePreview}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-left break-words">{message.content}</p>
                      )}
                    </div>

                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 max-w-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="text-primary h-4 w-4" />
                          <span className="text-muted-foreground text-xs font-medium">Sources</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {message.sources.slice(0, 4).map((source, idx) => (
                            <div
                              key={idx}
                              className="bg-accent border-border group/source hover:border-primary/30 cursor-pointer rounded-lg border p-3 transition-colors"
                              onClick={() => handlePreview(source)}
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="bg-primary/10 text-primary flex h-5 w-5 items-center justify-center rounded text-xs font-medium">
                                    {idx + 1}
                                  </span>
                                  <FileText className="text-primary h-3.5 w-3.5" />
                                  <Eye className="text-muted-foreground h-3 w-3 opacity-0 transition-opacity group-hover/source:opacity-100" />
                                </div>
                                <span className="text-chart-2 text-xs font-medium">
                                  {((source.score || 0) * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-muted-foreground group-hover/source:text-primary mb-1 truncate text-xs">
                                {(source.metadata?.filename as string) ||
                                  source.filename ||
                                  'Document'}
                              </p>
                              <p className="line-clamp-2 text-xs">{source.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && (
                <div className="flex gap-4">
                  <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-lg">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex-1 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div
                          className="bg-primary h-2 w-2 animate-bounce rounded-full"
                          style={{
                            animationDelay: '0ms',
                          }}
                        />
                        <div
                          className="bg-primary h-2 w-2 animate-bounce rounded-full"
                          style={{
                            animationDelay: '150ms',
                          }}
                        />
                        <div
                          className="bg-primary h-2 w-2 animate-bounce rounded-full"
                          style={{
                            animationDelay: '300ms',
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground text-xs">Generating response...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-background border-border border-t p-4 shrink-0 z-10">
          <div className="mx-auto max-w-4xl">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about your documents..."
                  disabled={isStreaming}
                  className="bg-accent border-border h-12 rounded-lg pr-12"
                />
              </div>
              <Button
                type="submit"
                disabled={isStreaming || !query.trim()}
                className="bg-primary h-12 w-12 rounded-lg"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
            <p className="text-muted-foreground mt-2 text-center text-xs">
              AI responses may contain errors. Verify important information.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Toggle */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="bg-card border-border text-primary fixed left-4 top-1/2 z-40 -translate-y-1/2 rounded-lg border p-2 shadow-sm lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* File Preview Dialog */}
      <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} file={previewFile} />
    </div>
  );
}
