import { create } from "zustand";

export const useAuthStore = create((set) => ({
  authMode: "login",
  authUser: null,
  authState: "loading",
  authError: "",
  setAuthMode: (authMode) => set({ authMode }),
  setAuthUser: (authUser) =>
    set({
      authUser,
      authState: "authenticated",
      authError: ""
    }),
  setSignedOut: () => set({ authUser: null, authState: "signed_out", authError: "" }),
  setAuthLoading: () => set({ authState: "loading", authError: "" }),
  setAuthError: (authError) => set({ authError, authState: "error" })
}));
