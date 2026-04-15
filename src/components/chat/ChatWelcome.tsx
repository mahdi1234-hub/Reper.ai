"use client";

import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

interface ChatWelcomeProps {
  onQuickAction: (text: string) => void;
}

const quickActions = [
  "What can you do?",
  "What deals need attention?",
  "Who should I follow up with?",
];

export default function ChatWelcome({ onQuickAction }: ChatWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center max-w-lg"
      >
        {/* Logo/Avatar */}
        <div className="w-16 h-16 mb-6 relative">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-emerald-400 rounded-full" />
            </div>
          </div>
          <div className="absolute top-2 right-0 w-3 h-3 bg-emerald-300 rounded-full" />
          <div className="absolute bottom-3 left-0 w-2 h-2 bg-emerald-200 rounded-full" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-slate-800 mb-8">
          How can I <span className="text-emerald-500">help</span>?
        </h1>

        {/* Quick Action Chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {quickActions.map((action) => (
            <motion.button
              key={action}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onQuickAction(action)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-600 transition-colors shadow-sm"
            >
              <MessageSquare size={14} className="text-slate-400" />
              {action}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
