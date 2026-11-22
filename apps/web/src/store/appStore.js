import { create } from "zustand";

export const useAppStore = create((set) => ({
  activePage: "resume",
  focusSection: "",
  latestVersionId: "",
  setActivePage: (activePage) => set({ activePage }),
  setFocusSection: (focusSection) => set({ focusSection }),
  setLatestVersionId: (latestVersionId) => set({ latestVersionId })
}));
