import { create } from "zustand";

interface UIState {
  activeWorkspaceId: string | null;
  activeSpaceId: string | null;
  activeListId: string | null;
  activeViewId: string; // "list" | "board" | "gantt" | "calendar" | "docs" | "chat" | "goals" | "dashboards" | "automations"
  selectedTaskId: string | null; // Right-hand Task Detail panel drawer
  sidebarExpanded: boolean;
  activeDocId: string | null;
  activeChannelId: string | null;

  setActiveWorkspaceId: (id: string | null) => void;
  setActiveSpaceId: (id: string | null) => void;
  setActiveListId: (id: string | null) => void;
  setActiveViewId: (id: string) => void;
  setSelectedTaskId: (id: string | null) => void;
  toggleSidebar: () => void;
  setActiveDocId: (id: string | null) => void;
  setActiveChannelId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeWorkspaceId: null,
  activeSpaceId: null,
  activeListId: null,
  activeViewId: "list",
  selectedTaskId: null,
  sidebarExpanded: true,
  activeDocId: null,
  activeChannelId: null,

  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id, activeSpaceId: null, activeListId: null }),
  setActiveSpaceId: (id) => set({ activeSpaceId: id, activeListId: null }),
  setActiveListId: (id) => set({ activeListId: id, activeViewId: "list" }),
  setActiveViewId: (id) => set((state) => ({ 
    activeViewId: id, 
    activeDocId: id === "docs" ? state.activeDocId : null, 
    activeChannelId: id === "chat" ? state.activeChannelId : null 
  })),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  setActiveDocId: (id) => set({ activeDocId: id, activeViewId: "docs" }),
  setActiveChannelId: (id) => set({ activeChannelId: id, activeViewId: "chat" }),
}));
