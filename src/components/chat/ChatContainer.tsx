"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import ChatWelcome from "./ChatWelcome";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolInvocations?: ToolInvocation[];
  createdAt?: Date;
}

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "result";
  result?: unknown;
}

interface ChatContainerProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

export default function ChatContainer({ conversationId, onConversationCreated }: ChatContainerProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCurrentConversationId(conversationId);
    if (!conversationId) setMessages([]);
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      let convId = currentConversationId;

      // Create conversation if needed
      if (!convId) {
        try {
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: content.substring(0, 50) }),
          });
          const conv = await res.json();
          convId = conv.id;
          setCurrentConversationId(conv.id);
          onConversationCreated?.(conv.id);
        } catch {
          convId = "temp-" + Date.now();
        }
      }

      const userMessage: Message = {
        id: "msg-" + Date.now(),
        role: "user",
        content,
        createdAt: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      const assistantMessage: Message = {
        id: "msg-" + (Date.now() + 1),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };

      setMessages([...updatedMessages, assistantMessage]);

      try {
        abortRef.current = new AbortController();

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
            conversationId: convId,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || `API error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          fullContent += text;

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: fullContent };
            }
            return updated;
          });
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: "Sorry, I encountered an error. Please try again.",
            };
          }
          return updated;
        });
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading, currentConversationId, onConversationCreated]
  );

  const handleSubmit = (e: React.FormEvent, fileContents?: string[]) => {
    e.preventDefault();
    let messageContent = input;
    if (fileContents && fileContents.length > 0) {
      messageContent = input + "\n\n--- Attached Files ---\n" + fileContents.join("\n\n");
    }
    sendMessage(messageContent);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const handleQuickAction = (text: string) => {
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <ChatWelcome onQuickAction={handleQuickAction} />
        ) : (
          <MessageList messages={messages} isLoading={isLoading} />
        )}
      </div>

      <div className="border-t border-slate-100 bg-white">
        <ChatInput
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          onStop={handleStop}
          hasMessages={messages.length > 0}
        />
      </div>
    </div>
  );
}
