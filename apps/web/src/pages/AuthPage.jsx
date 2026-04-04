import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import AmbientBackdrop from "../components/AmbientBackdrop";
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
    <main className="relative min-h-screen overflow-hidden px-4 py-12 text-stone-900">
      <AmbientBackdrop />
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <span className="inline-flex rounded-full border border-accent/20 bg-white/70 px-4 py-2 text-sm font-semibold text-accent shadow-panel backdrop-blur-xl">
            ResumePR Secure Access
          </span>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-[-0.04em] text-stone-950">
            Tailor your resume with job-aware AI suggestions you can review line by line.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-stone-600">
            Upload a resume, ingest a job description, inspect the skills gap, and approve only the rewrites that feel true.
            Every tailored version stays saved to your account.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-card rounded-[1.8rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Gap View</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">See matched and missing skills by section, not just a single ATS number.</p>
            </div>
            <div className="glass-card rounded-[1.8rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Diff Review</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">Accept or reject AI edits like a code review instead of trusting a blind rewrite.</p>
            </div>
            <div className="glass-card rounded-[1.8rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Version History</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">Compare, restore, and export tailored resume versions for each application.</p>
            </div>
          </div>
        </section>

        <div className="glass-card rounded-[2.2rem] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
          <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
            {authMode === "signup" ? "Create account" : "Sign in"}
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">
            {authMode === "signup" ? "Create your account" : "Pick up where you left off"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-stone-500">
            Resume data, job imports, suggestions, and saved versions stay scoped to your Firebase account.
          </p>

          <div className="mt-6 flex gap-2 rounded-full bg-stone-100/80 p-1">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold ${authMode === "login" ? "bg-stone-900 text-white" : "text-stone-700"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold ${authMode === "signup" ? "bg-accent text-white" : "text-stone-700"}`}
            >
              Sign Up
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-[1.4rem] border border-stone-200 bg-white/80 px-4 py-3.5 text-sm outline-none transition focus:border-accent focus:bg-white"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-[1.4rem] border border-stone-200 bg-white/80 px-4 py-3.5 text-sm outline-none transition focus:border-accent focus:bg-white"
            />
            <button type="button" onClick={handleEmailAuth} className="w-full rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#01575c]">
              {authMode === "signup" ? "Create account" : "Sign in"}
            </button>
            <button type="button" onClick={handleGoogleAuth} className="w-full rounded-full bg-stone-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-800">
              Continue with Google
            </button>
            {authError ? <p className="text-sm font-medium text-rose-600">{authError}</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
