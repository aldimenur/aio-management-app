"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore, type ChatMessage } from "@/lib/stores/chat-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

function MessageBubble({
  message,
  currentUser,
}: {
  message: ChatMessage;
  currentUser: string;
}) {
  const isCurrentUser = message.sender === currentUser;
  const timeString = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex w-full",
        isCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isCurrentUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {!isCurrentUser && (
          <div className="text-xs font-medium mb-1 opacity-70">
            {message.sender}
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap wrap-break-word">
          {message.text}
        </div>
        <div
          className={cn(
            "text-xs mt-1 opacity-70",
            isCurrentUser ? "text-right" : "text-left"
          )}
        >
          {timeString}
        </div>
      </div>
    </div>
  );
}

export function Chat() {
  const {
    messages,
    addMessage,
    clearMessages,
    currentUser,
    isLoading,
    loadMessages,
  } = useChatStore();
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (inputValue.trim() && !isSending) {
      setIsSending(true);
      try {
        await addMessage(inputValue.trim());
        setInputValue("");
        inputRef.current?.focus();
      } catch (error) {
        console.error("Failed to send message:", error);
        // You could show an error toast here
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    try {
      await clearMessages();
    } catch (error) {
      console.error("Failed to clear messages:", error);
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <CardTitle>Chat</CardTitle>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-destructive hover:text-destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">No messages yet</p>
                <p className="text-sm">
                  Start a conversation by sending a message below
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                currentUser={currentUser}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4 bg-muted/30">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending}
              size="default"
            >
              <HugeiconsIcon icon={SentIcon} className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
