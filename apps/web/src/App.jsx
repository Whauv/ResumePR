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
import { apiJson } from "./lib/api";
import { firebaseAuth } from "./lib/firebase";
import { e2ePage, isE2EMode } from "./lib/runtime";
import { useAppStore } from "./store/appStore";
import { useAnalysisStore } from "./store/analysisStore";
import { useAuthStore } from "./store/authStore";
import { useJobStore } from "./store/jobStore";
import { useResumeStore } from "./store/resumeStore";
import {
  E2E_ANALYSIS,
  E2E_JOB,
  E2E_RESUME_PAYLOAD,
  E2E_SUGGESTIONS,
  E2E_VERSION,
  E2E_VERSION_SUMMARY
} from "./test/e2eFixture";

async function fetchVersionSummaries(resumeId) {
  const payload = await apiJson(`/api/versions/${resumeId}`);
  return payload.versions;
}

async function fetchFullVersions(resumeId) {
  const payload = await apiJson(`/api/resume/${resumeId}/versions`);
  return payload.versions;
}

function formatHeaderDate(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function App() {
  useAmbientMotion();
  const e2eMode = isE2EMode();
  const { activePage, latestVersionId, setActivePage, setLatestVersionId } = useAppStore();
  const {
    metadata,
    versions,
    versionSummaries,
    restoreVersion,
    setParsedResume,
    setVersions,
    setVersionSummaries
  } = useResumeStore();
  const { setParsedJob } = useJobStore();
  const { setAnalysis, setSuggestions } = useAnalysisStore();
  const { authUser, authState, setAuthLoading, setAuthUser, setSignedOut } = useAuthStore();
  const effectiveAuthUser = authUser || (e2eMode ? { uid: "e2e-user" } : null);
  const activeVersion = versionSummaries.find((item) => item.version_id === latestVersionId) || versionSummaries[0] || null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (e2eMode) {
      setActivePage(e2ePage());
      return;
    }
    if (path === "/signup") {
      setActivePage("resume");
      return;
    }
    if (path === "/analyze" || params.get("job_id")) {
      setActivePage("jobs");
    }
  }, [e2eMode, setActivePage]);

  useEffect(() => {
    if (!e2eMode) return;
    setParsedResume(E2E_RESUME_PAYLOAD);
    setParsedJob(E2E_JOB);
    setAnalysis(E2E_ANALYSIS);
    setSuggestions(E2E_SUGGESTIONS);
    setVersions([E2E_VERSION]);
    setVersionSummaries([E2E_VERSION_SUMMARY]);
    setLatestVersionId(E2E_VERSION.version_id);
  }, [e2eMode, setAnalysis, setLatestVersionId, setParsedJob, setParsedResume, setSuggestions, setVersionSummaries, setVersions]);

  useEffect(() => {
    if (e2eMode) return undefined;
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
  }, [e2eMode, setAuthLoading, setAuthUser, setSignedOut]);

  useEffect(() => {
    if (e2eMode || !effectiveAuthUser || !metadata?.resumeId) return;
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
  }, [e2eMode, effectiveAuthUser, metadata?.resumeId, setVersionSummaries, setVersions, versionSummaries.length, versions.length]);

  if (!e2eMode && authState === "loading") {
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

  if (!effectiveAuthUser) {
    return <AuthPage />;
  }

  return (
    <div className="theme-app-frame relative min-h-screen overflow-x-hidden">
      <AmbientBackdrop />

      <nav className="sticky top-0 z-20 px-4 pt-4">
        <div className="theme-shell mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-[2rem] px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="theme-brand-badge rounded-[1.35rem] px-4 py-3">
              <p className="theme-primary-text text-[0.68rem] font-semibold uppercase tracking-[0.28em]">ResumePR</p>
              <p className="mt-1 text-lg font-semibold">Review resume edits like a pull request</p>
            </div>
            <div className="theme-muted-panel hidden rounded-[1.35rem] px-4 py-3 text-sm leading-6 xl:block">
              Dynamic analysis, version history, and extension sync all live in one review workspace.
            </div>
          </div>

          <div className="theme-nav-group flex flex-wrap gap-3 rounded-full p-1">
            <button
              type="button"
              onClick={() => setActivePage("resume")}
              className={`theme-nav-pill rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activePage === "resume" ? "theme-nav-pill-active" : ""
              }`}
            >
              Resume Upload
            </button>
            <button
              type="button"
              onClick={() => setActivePage("jobs")}
              className={`theme-nav-pill rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activePage === "jobs" ? "theme-nav-pill-active" : ""
              }`}
            >
              Job Intake
            </button>
            <button
              type="button"
              onClick={() => setActivePage("diff")}
              className={`theme-nav-pill rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activePage === "diff" ? "theme-nav-pill-active" : ""
              }`}
            >
              Diff Editor
            </button>
            <button
              type="button"
              onClick={() => setActivePage("versions")}
              className={`theme-nav-pill rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activePage === "versions" ? "theme-nav-pill-active" : ""
              }`}
            >
              Version History
            </button>
          </div>

          <div className="flex items-center gap-3">
            <details className="group relative">
              <summary className="theme-token-panel list-none rounded-[1.2rem] px-4 py-3 text-sm font-semibold shadow-sm">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: "var(--color-primary)", boxShadow: "var(--shadow-sm)" }} />
                {activeVersion
                  ? `v${activeVersion.version_number} - ${activeVersion.company_name || activeVersion.job_title} (${formatHeaderDate(activeVersion.timestamp)})`
                  : "No active version"}
              </summary>
              {versionSummaries.length ? (
                <div className="theme-shell absolute right-0 mt-3 w-80 rounded-[1.75rem] p-3">
                  {versionSummaries.map((version) => (
                    <button
                      key={version.version_id}
                      type="button"
                      onClick={() => {
                        setLatestVersionId(version.version_id);
                        restoreVersion(version.version_id);
                      }}
                      className="theme-nav-pill flex w-full flex-col rounded-[1.25rem] px-3 py-3 text-left transition"
                    >
                      <span className="text-sm font-semibold">
                        v{version.version_number} - {version.company_name || version.job_title}
                      </span>
                      <span className="theme-muted-text mt-1 text-xs">{formatHeaderDate(version.timestamp)}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </details>
            <button
              type="button"
              onClick={() => signOut(firebaseAuth)}
              className="theme-subtle-button rounded-[1.2rem] px-4 py-3 text-sm font-semibold"
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

      <footer className="theme-footer mx-4 mb-4 mt-10 rounded-[1.6rem] px-4 py-4 text-center text-xs font-medium tracking-[0.16em]">
        Command Palette: Cmd/Ctrl+K
      </footer>
      <CommandPalette />
    </div>
  );
}
