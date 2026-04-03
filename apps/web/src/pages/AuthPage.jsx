import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import { googleProvider, firebaseAuth } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { authMode, setAuthMode, setAuthError, authError } = useAuthStore();

  useEffect(() => {
    if (window.location.pathname === "/signup") setAuthMode("signup");
    if (window.location.pathname === "/login") setAuthMode("login");
  }, [setAuthMode]);

  async function handleEmailAuth() {
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      }
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleGoogleAuth() {
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (error) {
      setAuthError(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(1,105,111,0.14),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f2_100%)] px-4 py-12 text-stone-900">
      <div className="mx-auto max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 shadow-panel">
        <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
          Resume Modifier Auth
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">
          {authMode === "signup" ? "Create your account" : "Sign in to continue"}
        </h1>
        <p className="mt-2 text-sm leading-7 text-stone-500">
          All resume, job, version, and extension sync data is scoped to your account.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setAuthMode("login")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${authMode === "login" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("signup")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${authMode === "signup" ? "bg-accent text-white" : "bg-stone-100 text-stone-700"}`}
          >
            Sign Up
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm"
          />
          <button type="button" onClick={handleEmailAuth} className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white">
            {authMode === "signup" ? "Create account" : "Sign in"}
          </button>
          <button type="button" onClick={handleGoogleAuth} className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
            Continue with Google
          </button>
          {authError ? <p className="text-sm font-medium text-rose-600">{authError}</p> : null}
        </div>
      </div>
    </main>
  );
}
