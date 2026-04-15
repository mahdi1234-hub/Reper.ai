"use client";

import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { AtSign, Paperclip, ArrowUp, Square, X, Image as ImageIcon, FileText, File } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { cn, formatFileSize, getFileTypeLabel } from "@/lib/utils";

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface ContextItem {
  type: string;
  id: string;
  label: string;
  icon?: string;
}

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onStop: () => void;
  hasMessages: boolean;
}

const contextItems: ContextItem[] = [
  { type: "task", id: "t1", label: "Review pipeline deals", icon: "check" },
  { type: "task", id: "t2", label: "Follow up with leads", icon: "check" },
  { type: "task", id: "t3", label: "Update CRM records", icon: "check" },
  { type: "task", id: "t4", label: "Prepare sales report", icon: "check" },
  { type: "task", id: "t5", label: "Schedule team meeting", icon: "check" },
  { type: "deal", id: "d1", label: "Enterprise deal - Acme Corp", icon: "deal" },
  { type: "contact", id: "c1", label: "John Smith - VP Sales", icon: "contact" },
];

export default function ChatInput({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  onStop,
  hasMessages,
}: ChatInputProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);
  const [showContext, setShowContext] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, open: openFileDialog } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.url);
      return prev.filter((f) => f.id !== id);
    });
  };

  const removeContext = (id: string) => {
    setSelectedContexts((prev) => prev.filter((c) => c.id !== id));
  };

  const addContext = (item: ContextItem) => {
    if (!selectedContexts.find((c) => c.id === item.id)) {
      setSelectedContexts((prev) => [...prev, item]);
    }
    setShowContext(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
    if (e.key === "@") {
      setShowContext(true);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon size={14} className="text-emerald-500" />;
    if (type === "application/pdf") return <FileText size={14} className="text-red-500" />;
    return <File size={14} className="text-slate-500" />;
  };

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-3 w-full">
        {/* Context chips */}
        <AnimatePresence>
          {selectedContexts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-1 mb-2"
            >
              {selectedContexts.map((ctx) => (
                <span
                  key={ctx.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700"
                >
                  {ctx.label}
                  <button
                    onClick={() => removeContext(ctx.id)}
                    className="hover:bg-blue-100 rounded p-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* File chips */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-2"
            >
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-150 max-w-[200px]"
                >
                  {getFileIcon(file.type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{getFileTypeLabel(file.name)} &middot; {formatFileSize(file.size)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <form onSubmit={onSubmit} {...getRootProps()} className="relative">
          <input {...getInputProps()} />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasMessages ? "Ask Reper a follow-up question" : "Ask Reper questions about your customers and deals"}
            rows={1}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-24 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            style={{ minHeight: "48px", maxHeight: "200px" }}
          />

          {/* Right side buttons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={openFileDialog}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Paperclip size={18} />
            </button>
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors"
              >
                <Square size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && files.length === 0}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  input.trim() || files.length > 0
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                <ArrowUp size={14} />
              </button>
            )}
          </div>
        </form>

        {/* @ Add context button */}
        <div className="flex items-center mt-2">
          <Popover.Root open={showContext} onOpenChange={setShowContext}>
            <Popover.Trigger asChild>
              <button className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors">
                <AtSign size={14} />
                Add context
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                sideOffset={8}
                className="w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
              >
                <Command className="w-full">
                  <Command.Input
                    placeholder="Search..."
                    className="w-full px-3 py-2 text-sm border-b border-slate-200 outline-none placeholder:text-slate-400"
                  />
                  <Command.List className="max-h-64 overflow-y-auto p-1">
                    <Command.Empty className="px-3 py-2 text-sm text-slate-400">
                      No results found
                    </Command.Empty>
                    <Command.Group heading="Tasks" className="px-2 py-1.5 text-xs font-medium text-slate-500">
                      {contextItems
                        .filter((i) => i.type === "task")
                        .map((item) => (
                          <Command.Item
                            key={item.id}
                            value={item.label}
                            onSelect={() => addContext(item)}
                            className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 rounded-md cursor-pointer hover:bg-slate-50 data-[selected]:bg-blue-50 data-[selected]:text-blue-700"
                          >
                            <div className="w-4 h-4 rounded border border-green-400 bg-green-50 flex items-center justify-center">
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none" className="text-green-500">
                                <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                            {item.label}
                          </Command.Item>
                        ))}
                    </Command.Group>
                    <Command.Separator className="h-px bg-slate-100 my-1" />
                    <Command.Group heading="Deals" className="px-2 py-1.5 text-xs font-medium text-slate-500">
                      {contextItems
                        .filter((i) => i.type === "deal")
                        .map((item) => (
                          <Command.Item
                            key={item.id}
                            value={item.label}
                            onSelect={() => addContext(item)}
                            className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 rounded-md cursor-pointer hover:bg-slate-50"
                          >
                            {item.label}
                          </Command.Item>
                        ))}
                    </Command.Group>
                  </Command.List>
                </Command>
                <div className="border-t border-slate-100 px-3 py-2">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <AtSign size={12} /> Add context
                  </span>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>

      {/* File Preview Modal */}
      <Dialog.Root open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[660px] max-h-[80vh] overflow-hidden">
            {previewFile && (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{previewFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {getFileTypeLabel(previewFile.name)} &middot; {formatFileSize(previewFile.size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewFile.url}
                      download={previewFile.name}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Download
                    </a>
                    <Dialog.Close className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600">
                      <X size={16} />
                    </Dialog.Close>
                  </div>
                </div>
                <div className="flex items-center justify-center p-4 bg-slate-50 min-h-[300px] max-h-[60vh] overflow-auto">
                  {previewFile.type.startsWith("image/") ? (
                    <img
                      src={previewFile.url}
                      alt={previewFile.name}
                      className="max-w-full max-h-[55vh] object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <FileText size={48} />
                      <p className="text-sm">Preview not available for this file type</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
