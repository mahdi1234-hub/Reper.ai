"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  Home,
  MessageSquare,
  Bell,
  CheckSquare,
  Search as SearchIcon,
  Building2,
  Users,
  Handshake,
  Calendar,
  BarChart3,
  Bot,
  Workflow,
  Target,
  Plus,
  ChevronDown,
  LogOut,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import * as Avatar from "@radix-ui/react-avatar";
import * as Tooltip from "@radix-ui/react-tooltip";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages?: { content: string }[];
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  id: string;
  highlight?: boolean;
  badge?: number;
}

const navSections: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { icon: Home, label: "Home", id: "home" },
      { icon: MessageSquare, label: "Reper AI", id: "chat", highlight: true },
      { icon: Bell, label: "Notifications", id: "notifications", badge: 5 },
      { icon: CheckSquare, label: "Tasks", id: "tasks", badge: 7 },
    ],
  },
  {
    label: "Tools",
    items: [
      { icon: Target, label: "Lead Finder", id: "lead-finder" },
      { icon: Workflow, label: "Campaigns", id: "campaigns" },
      { icon: Bot, label: "Workflows", id: "workflows" },
      { icon: Bot, label: "Agents", id: "agents" },
      { icon: BarChart3, label: "Reports", id: "reports" },
    ],
  },
  {
    label: "Objects",
    items: [
      { icon: Building2, label: "Companies", id: "companies" },
      { icon: Users, label: "People", id: "people" },
      { icon: Handshake, label: "Deals", id: "deals" },
      { icon: Calendar, label: "Meetings", id: "meetings" },
    ],
  },
];

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState("chat");
  const [showObjects, setShowObjects] = useState(true);
  const [showTools, setShowTools] = useState(true);

  return (
    <Tooltip.Provider delayDuration={300}>
      <div
        className={cn(
          "flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-200",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="font-semibold text-slate-800 text-sm">Reper</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <>
                <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                  <SearchIcon size={16} />
                </button>
                <button
                  onClick={onNewChat}
                  className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
            >
              {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          {navSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="mb-1">
              {section.label && !isCollapsed && (
                <button
                  onClick={() => {
                    if (section.label === "Objects") setShowObjects(!showObjects);
                    if (section.label === "Tools") setShowTools(!showTools);
                  }}
                  className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 w-full"
                >
                  <ChevronDown
                    size={12}
                    className={cn(
                      "transition-transform",
                      section.label === "Objects" && !showObjects && "-rotate-90",
                      section.label === "Tools" && !showTools && "-rotate-90"
                    )}
                  />
                  {section.label}
                </button>
              )}
              {((section.label === "Objects" && showObjects) ||
                (section.label === "Tools" && showTools) ||
                !section.label) &&
                section.items.map((item) => (
                  <Tooltip.Root key={item.id}>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors",
                          activeSection === item.id
                            ? "bg-slate-100 text-slate-900 font-medium"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800",
                          isCollapsed && "justify-center px-0"
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            item.highlight && activeSection === item.id
                              ? "text-emerald-600"
                              : ""
                          )}
                        />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.badge && (
                              <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    </Tooltip.Trigger>
                    {isCollapsed && (
                      <Tooltip.Content
                        side="right"
                        className="bg-slate-800 text-white text-xs px-2 py-1 rounded"
                      >
                        {item.label}
                      </Tooltip.Content>
                    )}
                  </Tooltip.Root>
                ))}
            </div>
          ))}

          {/* Chat History */}
          {!isCollapsed && activeSection === "chat" && conversations.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-2">
              <div className="px-4 py-1.5 text-xs font-medium text-slate-400 flex items-center gap-1">
                <ChevronDown size={12} />
                Favorites
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="border-t border-slate-100 p-3">
          {session?.user && (
            <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
              <Avatar.Root className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                <Avatar.Image
                  src={session.user.image || ""}
                  alt={session.user.name || ""}
                  className="w-full h-full object-cover"
                />
                <Avatar.Fallback className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-600">
                  {session.user.name?.charAt(0) || "U"}
                </Avatar.Fallback>
              </Avatar.Root>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {session.user.name}
                  </p>
                </div>
              )}
              {!isCollapsed && (
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
}
