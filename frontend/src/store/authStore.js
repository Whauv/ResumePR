import { create } from "zustand";

export const useAuthStore = create((set) => ({
  authMode: "login",
  authUser: null,
  authUid: "",
  authState: "loading",
  authError: "",
  setAuthMode: (authMode) => set({ authMode }),
  setAuthUser: (authUser) =>
    set({
      authUser,
      authUid: authUser?.uid || "",
      authState: "authenticated",
      authError: ""
    }),
  setSignedOut: () => set({ authUser: null, authUid: "", authState: "signed_out", authError: "" }),
  setAuthLoading: () => set({ authState: "loading", authError: "" }),
  setAuthError: (authError) => set({ authError, authState: "error" })
}));
