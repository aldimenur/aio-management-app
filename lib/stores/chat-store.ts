import { create } from "zustand";

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
}

interface ChatMessageFromAPI {
  id: string;
  text: string;
  sender: string;
  timestamp: string; // ISO string
}

interface ChatState {
  messages: ChatMessage[];
  currentUser: string;
  isLoading: boolean;
  addMessage: (text: string, sender?: string) => Promise<void>;
  loadMessages: () => Promise<void>;
  setCurrentUser: (user: string) => void;
  clearMessages: () => Promise<void>;
  setMessages: (messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentUser: "You",
  isLoading: false,
  addMessage: async (text: string, sender?: string) => {
    const state = get();
    const newMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      sender: sender || state.currentUser,
      timestamp: new Date(),
    };

    // Optimistically update UI
    set({ messages: [...state.messages, newMessage] });

    // Save to server
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sender: sender || state.currentUser,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save message");
      }
    } catch (error) {
      console.error("Error saving message:", error);
      // Revert optimistic update on error
      set({ messages: state.messages });
      throw error;
    }
  },
  loadMessages: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch("/api/chat");
      if (!response.ok) {
        throw new Error("Failed to load messages");
      }
      const data = await response.json();
      const messages: ChatMessage[] = (data.messages as ChatMessageFromAPI[]).map(
        (msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })
      );
      set({ messages, isLoading: false });
    } catch (error) {
      console.error("Error loading messages:", error);
      set({ isLoading: false });
    }
  },
  setCurrentUser: (user: string) => set({ currentUser: user }),
  clearMessages: async () => {
    // Optimistically clear UI
    set({ messages: [] });

    // Clear on server
    try {
      const response = await fetch("/api/chat", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear messages");
      }
    } catch (error) {
      console.error("Error clearing messages:", error);
      // Reload messages on error
      get().loadMessages();
      throw error;
    }
  },
  setMessages: (messages: ChatMessage[]) => set({ messages }),
}));

