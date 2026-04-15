"use client";

import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Download,
  FileSearch,
  Loader2,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import InlineTable from "./InlineTable";

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

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

function ToolCallCard({ toolName, isComplete }: { toolName: string; isComplete: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  const toolLabels: Record<string, string> = {
    "query-data": "Read data",
    "create-record": "Create record",
    "find-leads": "Search leads",
    "create-email-draft": "Draft email",
    "ask-structured-question": "Ask question",
    "read-google-data": "Read Google data",
    "update-record": "Update record",
  };

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="my-2">
      <Collapsible.Trigger className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500 hover:bg-slate-100 transition-colors w-auto cursor-pointer">
        <FileSearch size={14} className="text-slate-400" />
        <span className="font-medium">{toolLabels[toolName] || toolName}</span>
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </Collapsible.Trigger>
      <Collapsible.Content className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {isComplete ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <Loader2 size={12} className="animate-spin text-slate-400" />
          )}
          <span>Prepared query</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
          {isComplete ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <Loader2 size={12} className="animate-spin text-slate-400" />
          )}
          <span>Ran query</span>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <button
        onClick={handleCopy}
        className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
        title="Copy"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <button
        onClick={() => setFeedback(feedback === "up" ? null : "up")}
        className={`p-1.5 hover:bg-slate-100 rounded-md transition-colors ${
          feedback === "up" ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"
        }`}
        title="Good response"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => setFeedback(feedback === "down" ? null : "down")}
        className={`p-1.5 hover:bg-slate-100 rounded-md transition-colors ${
          feedback === "down" ? "text-red-500" : "text-slate-400 hover:text-slate-600"
        }`}
        title="Bad response"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}

const markdownComponents = {
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<"table">) => (
    <InlineTable>{children}</InlineTable>
  ),
  strong: ({ children }: React.ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  a: ({ children, href }: React.ComponentPropsWithoutRef<"a">) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {children}
    </a>
  ),
  code: ({ children, className }: React.ComponentPropsWithoutRef<"code"> & { className?: string }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="bg-slate-900 text-slate-100 rounded-md p-4 overflow-x-auto my-3 text-sm">
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code className="text-cyan-600 font-mono text-[0.85em]">{children}</code>
    );
  },
  p: ({ children }: React.ComponentPropsWithoutRef<"p">) => (
    <p className="mb-3 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: React.ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }: React.ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
  ),
  h1: ({ children }: React.ComponentPropsWithoutRef<"h1">) => (
    <h1 className="text-xl font-bold text-slate-900 mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }: React.ComponentPropsWithoutRef<"h2">) => (
    <h2 className="text-lg font-bold text-slate-900 mt-3 mb-2">{children}</h2>
  ),
  h3: ({ children }: React.ComponentPropsWithoutRef<"h3">) => (
    <h3 className="text-base font-bold text-slate-900 mt-3 mb-1">{children}</h3>
  ),
};

export default function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <AnimatePresence>
        {messages.map((message, i) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`mb-6 ${message.role === "user" ? "flex justify-end" : ""}`}
          >
            {message.role === "user" ? (
              <div className="bg-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                <p className="text-sm text-slate-800">{message.content}</p>
              </div>
            ) : (
              <div className="w-full">
                {/* Tool calls would show here */}
                {message.toolInvocations?.map((tool) => (
                  <ToolCallCard
                    key={tool.toolCallId}
                    toolName={tool.toolName}
                    isComplete={tool.state === "result"}
                  />
                ))}

                {/* Message content */}
                <div className="text-sm text-slate-700 prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents as Record<string, React.ComponentType>}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Loading indicator */}
                {isLoading && i === messages.length - 1 && !message.content && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="italic">Thinking...</span>
                  </div>
                )}

                {/* Action buttons */}
                {message.content && <MessageActions content={message.content} />}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
