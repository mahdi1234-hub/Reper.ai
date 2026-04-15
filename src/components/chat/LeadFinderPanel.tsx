"use client";

import { useState } from "react";
import { useLeadFinderStore } from "@/lib/store";
import {
  X,
  Search,
  Download,
  Import,
  Filter,
  SortAsc,
  ChevronDown,
  Mail,
} from "lucide-react";
import * as Avatar from "@radix-ui/react-avatar";
import * as Select from "@radix-ui/react-select";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";

function EmailScore({ score }: { score: number }) {
  if (score >= 0.75) {
    return (
      <span className="text-green-500 font-mono text-xs" title="High confidence">
        &#9679;&#9679;&#9679;
      </span>
    );
  }
  if (score >= 0.5) {
    return (
      <span className="font-mono text-xs" title="Medium confidence">
        <span className="text-yellow-500">&#9679;&#9679;</span>
        <span className="text-slate-300">&#9679;</span>
      </span>
    );
  }
  return (
    <span className="font-mono text-xs" title="Low confidence">
      <span className="text-red-500">&#9679;</span>
      <span className="text-slate-300">&#9679;&#9679;</span>
    </span>
  );
}

export default function LeadFinderPanel() {
  const {
    isOpen,
    setOpen,
    results,
    totalCount,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isLoading,
    activeTab,
    setActiveTab,
  } = useLeadFinderStore();

  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredResults = searchQuery
    ? results.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : results;

  const handleExport = () => {
    const data = filteredResults.map((r) => ({
      Name: r.name,
      Title: r.title,
      Company: r.company,
      Location: r.location,
      Email: r.email,
      "Email Score": r.emailScore >= 0.75 ? "High" : r.emailScore >= 0.5 ? "Medium" : "Low",
      LinkedIn: r.linkedin,
      Industry: r.industry,
      "Company Size": r.companySize,
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "leads-export.csv");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500",
      "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-amber-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="h-full bg-white border-l border-slate-200 flex flex-col" style={{ width: "600px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-sm text-slate-800">Lead Finder</h2>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{totalCount.toLocaleString()}</span> results
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === "people" ? "companies" : "people")}
            className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            {activeTab === "people" ? "People" : "Companies"}
          </button>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded text-xs text-slate-600">
          <Filter size={12} />
          Fields <span className="font-medium text-slate-800">10</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded text-xs text-slate-600">
          <Filter size={12} />
          Filter <span className="font-medium text-slate-800">4</span>
          <X size={10} className="text-slate-400 cursor-pointer" />
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded text-xs text-slate-600 cursor-pointer">
          <SortAsc size={12} />
          Sort
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-7 pr-3 py-1 text-xs border border-slate-200 rounded w-40 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center gap-0 px-3 py-2 border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
        <div className="w-8">
          <input
            type="checkbox"
            onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
            checked={selectedIds.size === results.length && results.length > 0}
            className="rounded border-slate-300"
          />
        </div>
        <div className="flex-1 min-w-[180px]">Person</div>
        <div className="w-[200px]">Job title</div>
        <div className="w-[180px]">Email addresses</div>
        <div className="w-[60px]">Score</div>
      </div>

      {/* Table body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-sm text-slate-400">
            Loading leads...
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-slate-400">
            No leads found
          </div>
        ) : (
          filteredResults.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center gap-0 px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm"
            >
              <div className="w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.has(lead.id)}
                  onChange={() => toggleSelect(lead.id)}
                  className="rounded border-slate-300"
                />
              </div>
              <div className="flex-1 min-w-[180px] flex items-center gap-2">
                <Avatar.Root className={cn("w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-medium", getAvatarColor(lead.name))}>
                  <Avatar.Fallback>{getInitials(lead.name)}</Avatar.Fallback>
                </Avatar.Root>
                <span className="font-medium text-slate-800 truncate">{lead.name}</span>
              </div>
              <div className="w-[200px] text-slate-600 truncate">{lead.title}</div>
              <div className="w-[180px] text-slate-600 truncate text-xs">{lead.email}</div>
              <div className="w-[60px]">
                <EmailScore score={lead.emailScore} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-500">
          {selectedIds.size > 0 && <span className="font-medium">{selectedIds.size} selected</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded hover:bg-white transition-colors"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            disabled={selectedIds.size === 0}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors",
              selectedIds.size > 0
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            <Import size={12} /> Import Selected
          </button>
        </div>
      </div>
    </div>
  );
}
