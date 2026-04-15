"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("google");
    }
  }, [status]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      // Silent
    }
  };

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

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Please sign in to continue</p>
          <button
            onClick={() => signIn("google")}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewChat={handleNewChat}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main chat area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lead Finder Panel (left side when open) */}
        {leadFinderOpen && <LeadFinderPanel />}

        {/* Chat */}
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
