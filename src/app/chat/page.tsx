"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import Sidebar from "@/components/chat/Sidebar";
import ChatContainer from "@/components/chat/ChatContainer";
import LeadFinderPanel from "@/components/chat/LeadFinderPanel";
import { useLeadFinderStore } from "@/lib/store";
import { Loader2 } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages?: { content: string }[];
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isOpen: leadFinderOpen } = useLeadFinderStore();

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchConversations();
    }
  }, [session, fetchConversations]);

  const handleNewChat = () => {
    setActiveConversationId(null);
  };

  const handleConversationCreated = (id: string) => {
    setActiveConversationId(id);
    fetchConversations();
  };

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  // Show sign-in prompt (NOT auto-redirect to avoid loops)
  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Reper.ai</h1>
          <p className="text-slate-600 mb-6">Sign in to access your AI-powered CRM agent</p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/chat" })}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
              <path d="M3.964 10.706a5.41 5.41 0 0 1-.282-1.706c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewChat={handleNewChat}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex overflow-hidden">
        {leadFinderOpen && <LeadFinderPanel />}

        <div className="flex-1">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <div className="text-sm font-medium text-slate-700">
              {activeConversationId
                ? conversations.find((c) => c.id === activeConversationId)?.title || "Chat"
                : "New Chat"}
            </div>
            <button
              onClick={handleNewChat}
              className="px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 transition-colors"
            >
              New chat
            </button>
          </div>
          <div className="h-[calc(100vh-49px)]">
            <ChatContainer
              conversationId={activeConversationId}
              onConversationCreated={handleConversationCreated}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
