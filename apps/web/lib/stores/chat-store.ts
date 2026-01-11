import { create } from "zustand";

interface Message {
    role: "user" | "assistant";
    content: string;
    sources?: Array<{
        content?: string;
        score?: number;
        filename?: string;
        metadata?: Record<string, unknown>;
    }>;
}

interface ChatState {
    currentChatId: string | null;
    messages: Message[];
    query: string;
    isStreaming: boolean;
    setCurrentChatId: (id: string | null) => void;
    setMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;
    setQuery: (query: string) => void;
    setIsStreaming: (streaming: boolean) => void;
    reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    currentChatId: null,
    messages: [],
    query: "",
    isStreaming: false,
    setCurrentChatId: (id) => set({ currentChatId: id }),
    setMessages: (messages) => set({ messages }),
    addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
    setQuery: (query) => set({ query }),
    setIsStreaming: (isStreaming) => set({ isStreaming }),
    reset: () => set({ currentChatId: null, messages: [], query: "" }),
}));
