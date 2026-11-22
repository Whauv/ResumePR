import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";

/**
 * Subscribes to Firebase auth state and mirrors it into authStore + localStorage.
 * No-op when `enabled` is false (e.g. E2E mode).
 */
export default function useAuthSession(enabled) {
  const { setAuthLoading, setAuthUser, setSignedOut } = useAuthStore();

  useEffect(() => {
    if (!enabled) return undefined;
    setAuthLoading();
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        localStorage.setItem("resumepr_auth_token", token);
        localStorage.setItem("resumepr_auth_uid", user.uid);
        setAuthUser(user);
      } else {
        localStorage.removeItem("resumepr_auth_token");
        localStorage.removeItem("resumepr_auth_uid");
        setSignedOut();
      }
    });
    return () => unsubscribe();
  }, [enabled, setAuthLoading, setAuthUser, setSignedOut]);
}
