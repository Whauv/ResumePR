import { useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import AmbientBackdrop from "./components/AmbientBackdrop";
import CommandPalette from "./components/CommandPalette";
import SkeletonBlock from "./components/SkeletonBlock";
import useAmbientMotion from "./hooks/useAmbientMotion";
import AuthPage from "./pages/AuthPage";
import DiffEditorPage from "./pages/DiffEditorPage";
import JobInputPage from "./pages/JobInputPage";
import ResumeVersionHistoryPage from "./pages/ResumeVersionHistoryPage";
import UploadPage from "./pages/UploadPage";
import { apiFetch } from "./lib/api";
import { firebaseAuth } from "./lib/firebase";
import { useAppStore } from "./store/appStore";
import { useAuthStore } from "./store/authStore";
import { useResumeStore } from "./store/resumeStore";

async function fetchVersionSummaries(resumeId) {
  const response = await apiFetch(`/api/versions/${resumeId}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Failed to load version summaries.");
  return payload.versions;
}

async function fetchFullVersions(resumeId) {
  const response = await apiFetch(`/api/resume/${resumeId}/versions`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Failed to load full versions.");
  return payload.versions;
}

function formatHeaderDate(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function App() {
  useAmbientMotion();
  const { activePage, latestVersionId, setActivePage, setLatestVersionId } = useAppStore();
  const { metadata, versions, versionSummaries, restoreVersion, setVersions, setVersionSummaries } = useResumeStore();
  const { authUser, authState, setAuthLoading, setAuthUser, setSignedOut } = useAuthStore();
  const activeVersion = versionSummaries.find((item) => item.version_id === latestVersionId) || versionSummaries[0] || null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (path === "/signup") {
      setActivePage("resume");
      return;
    }
    if (path === "/analyze" || params.get("job_id")) {
      setActivePage("jobs");
    }
  }, [setActivePage]);

  useEffect(() => {
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
  }, [setAuthLoading, setAuthUser, setSignedOut]);

  useEffect(() => {
    if (!authUser || !metadata?.resumeId) return;
    let cancelled = false;

    async function hydrateVersions() {
      try {
        const tasks = [];
        if (!versionSummaries.length) tasks.push(fetchVersionSummaries(metadata.resumeId).then((data) => ({ kind: "summary", data })));
        if (!versions.length) tasks.push(fetchFullVersions(metadata.resumeId).then((data) => ({ kind: "full", data })));
        const results = await Promise.all(tasks);
        if (cancelled) return;
        for (const result of results) {
          if (result.kind === "summary") setVersionSummaries(result.data);
          if (result.kind === "full") setVersions(result.data);
        }
      } catch (_error) {
        // Keep the header quiet if version data is not ready yet.
      }
    }

    hydrateVersions();
    return () => {
      cancelled = true;
    };
  }, [authUser, metadata?.resumeId, setVersionSummaries, setVersions, versionSummaries.length, versions.length]);

  if (authState === "loading") {
    return (
      <main className="min-h-screen px-4 py-12">
        <AmbientBackdrop />
        <div className="mx-auto max-w-5xl space-y-4">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-72 w-full" />
          <SkeletonBlock className="h-72 w-full" />
        </div>
      </main>
    );
  }

  if (!authUser) {
    return <AuthPage />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <AmbientBackdrop />

      <nav className="sticky top-0 z-20 px-4 pt-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/70 bg-white/78 px-4 py-4 shadow-panel backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="rounded-[1.35rem] border border-accent/20 bg-accent/10 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-accent/80">ResumePR</p>
              <p className="mt-1 text-lg font-semibold text-stone-950">Review resume edits like a pull request</p>
            </div>
            <div className="hidden rounded-[1.35rem] border border-stone-200/80 bg-stone-50/85 px-4 py-3 text-sm leading-6 text-stone-600 xl:block">
              Dynamic analysis, version history, and extension sync all live in one review workspace.
            </div>
          </div>

          <div className="flex flex-wrap gap-3 rounded-full border border-stone-200/80 bg-stone-100/80 p-1">
            <button
              type="button"
              onClick={() => setActivePage("resume")}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activePage === "resume" ? "bg-stone-950 text-white shadow-lg" : "text-stone-600 hover:bg-white"
              }`}
            >
              Resume Upload
            </button>
            <button
              type="button"
              onClick={() => setActivePage("jobs")}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activePage === "jobs" ? "bg-accent text-white shadow-lg shadow-accent/25" : "text-stone-600 hover:bg-white"
              }`}
            >
              Job Intake
            </button>
            <button
              type="button"
              onClick={() => setActivePage("diff")}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activePage === "diff" ? "bg-stone-900 text-white shadow-lg" : "text-stone-600 hover:bg-white"
              }`}
            >
              Diff Editor
            </button>
            <button
              type="button"
              onClick={() => setActivePage("versions")}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activePage === "versions" ? "bg-stone-950 text-white shadow-lg" : "text-stone-600 hover:bg-white"
              }`}
            >
              Version History
            </button>
          </div>

          <div className="flex items-center gap-3">
            <details className="group relative">
              <summary className="list-none rounded-[1.2rem] border border-accent/15 bg-white px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-accent align-middle shadow-[0_0_14px_rgba(1,105,111,0.55)]" />
                {activeVersion
                  ? `v${activeVersion.version_number} - ${activeVersion.company_name || activeVersion.job_title} (${formatHeaderDate(activeVersion.timestamp)})`
                  : "No active version"}
              </summary>
              {versionSummaries.length ? (
                <div className="absolute right-0 mt-3 w-80 rounded-[1.75rem] border border-white/70 bg-white/94 p-3 shadow-panel backdrop-blur-xl">
                  {versionSummaries.map((version) => (
                    <button
                      key={version.version_id}
                      type="button"
                      onClick={() => {
                        setLatestVersionId(version.version_id);
                        restoreVersion(version.version_id);
                      }}
                      className="flex w-full flex-col rounded-[1.25rem] px-3 py-3 text-left transition hover:bg-stone-50"
                    >
                      <span className="text-sm font-semibold text-stone-900">
                        v{version.version_number} - {version.company_name || version.job_title}
                      </span>
                      <span className="mt-1 text-xs text-stone-500">{formatHeaderDate(version.timestamp)}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </details>
            <button
              type="button"
              onClick={() => signOut(firebaseAuth)}
              className="rounded-[1.2rem] border border-stone-200/80 bg-stone-100/90 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {activePage === "resume" ? <UploadPage /> : null}
      {activePage === "jobs" ? <JobInputPage /> : null}
      {activePage === "diff" ? <DiffEditorPage /> : null}
      {activePage === "versions" ? <ResumeVersionHistoryPage /> : null}

      <footer className="mx-4 mb-4 mt-10 rounded-[1.6rem] border border-white/70 bg-white/76 px-4 py-4 text-center text-xs font-medium tracking-[0.16em] text-stone-500 shadow-panel backdrop-blur-xl">
        Command Palette: Cmd/Ctrl+K
      </footer>
      <CommandPalette />
    </div>
  );
}
