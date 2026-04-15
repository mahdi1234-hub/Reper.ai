import { create } from "zustand";

export interface LeadFinderFilters {
  industry: string[];
  location: string;
  companySize: string[];
  jobTitle: string;
  seniority: string[];
  keywords: string;
}

export interface LeadResult {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  email: string;
  emailScore: number;
  linkedin: string;
  industry: string;
  companySize: string;
  avatar?: string;
}

interface LeadFinderState {
  isOpen: boolean;
  filters: LeadFinderFilters;
  results: LeadResult[];
  totalCount: number;
  selectedIds: Set<string>;
  isLoading: boolean;
  page: number;
  pageSize: number;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  activeTab: "companies" | "people";
  setOpen: (open: boolean) => void;
  setFilters: (filters: Partial<LeadFinderFilters>) => void;
  setResults: (results: LeadResult[], totalCount: number) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setPage: (page: number) => void;
  setSort: (column: string, direction: "asc" | "desc") => void;
  setActiveTab: (tab: "companies" | "people") => void;
  reset: () => void;
}

const defaultFilters: LeadFinderFilters = {
  industry: [],
  location: "",
  companySize: [],
  jobTitle: "",
  seniority: [],
  keywords: "",
};

export const useLeadFinderStore = create<LeadFinderState>((set, get) => ({
  isOpen: false,
  filters: defaultFilters,
  results: [],
  totalCount: 0,
  selectedIds: new Set(),
  isLoading: false,
  page: 1,
  pageSize: 25,
  sortColumn: "name",
  sortDirection: "asc",
  activeTab: "people",
  setOpen: (open) => set({ isOpen: open }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setResults: (results, totalCount) => set({ results, totalCount }),
  toggleSelect: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(state.results.map((r) => r.id)),
    })),
  clearSelection: () => set({ selectedIds: new Set() }),
  setLoading: (loading) => set({ isLoading: loading }),
  setPage: (page) => set({ page }),
  setSort: (column, direction) =>
    set({ sortColumn: column, sortDirection: direction }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  reset: () =>
    set({
      filters: defaultFilters,
      results: [],
      totalCount: 0,
      selectedIds: new Set(),
      page: 1,
    }),
}));

interface SidebarState {
  isCollapsed: boolean;
  activeSection: string;
  toggle: () => void;
  setActiveSection: (section: string) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  activeSection: "chat",
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setActiveSection: (section) => set({ activeSection: section }),
}));
