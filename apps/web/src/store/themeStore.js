import { create } from "zustand";

const STORAGE_KEY = "resumepr_theme";

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch (_error) {
    // localStorage may be unavailable (private mode, blocked storage).
  }
  return null;
}

function prefersDark() {
  try {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  } catch (_error) {
    return false;
  }
}

export function getInitialTheme() {
  return readStoredTheme() || (prefersDark() ? "dark" : "light");
}

function persist(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (_error) {
    // Ignore persistence failures; the in-memory theme still applies.
  }
}

export const useThemeStore = create((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    persist(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      persist(next);
      return { theme: next };
    })
}));
