import { create } from "zustand";

export const useAppStore = create((set) => ({
  activePage: "resume",
  phase4TargetSection: "",
  latestVersionId: "",
  setActivePage: (activePage) => set({ activePage }),
  setPhase4TargetSection: (phase4TargetSection) => set({ phase4TargetSection }),
  clearPhase4TargetSection: () => set({ phase4TargetSection: "" }),
  setLatestVersionId: (latestVersionId) => set({ latestVersionId })
}));
