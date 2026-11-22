import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { signOut } from "firebase/auth";
import CommandPalette from "./CommandPalette";
import DiffEditorPage from "../pages/DiffEditorPage";
import JobInputPage from "../pages/JobInputPage";
import ResumeVersionHistoryPage from "../pages/ResumeVersionHistoryPage";
import UploadPage from "../pages/UploadPage";
import { firebaseAuth } from "../lib/firebase";
import { WORKSPACE_NAV } from "../lib/workspaceNav";
import { useAppStore } from "../store/appStore";
import { useResumeStore } from "../store/resumeStore";
import { useThemeStore } from "../store/themeStore";

function formatHeaderDate(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function WorkspaceLayout() {
  const reduceMotion = useReducedMotion();
  const pillTransition = reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 };
  const { activePage, latestVersionId, setActivePage, setLatestVersionId } = useAppStore();
  const { versionSummaries, restoreVersion } = useResumeStore();
  const { theme, toggleTheme } = useThemeStore();
  const activeVersion =
    versionSummaries.find((item) => item.version_id === latestVersionId) || versionSummaries[0] || null;

  return (
    <div className="theme-app-frame relative min-h-screen overflow-x-hidden">
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
            {WORKSPACE_NAV.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePage(item.id)}
                  className={`theme-nav-pill relative rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    isActive ? "text-white" : ""
                  }`}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="nav-pill"
                      className="theme-nav-pill-active absolute inset-0 rounded-full"
                      transition={pillTransition}
                    />
                  ) : null}
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
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
              data-testid="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="theme-subtle-button rounded-[1.2rem] px-4 py-3 text-sm font-semibold"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
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

      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
        >
          {activePage === "resume" ? <UploadPage /> : null}
          {activePage === "jobs" ? <JobInputPage /> : null}
          {activePage === "diff" ? <DiffEditorPage /> : null}
          {activePage === "versions" ? <ResumeVersionHistoryPage /> : null}
        </motion.div>
      </AnimatePresence>

      <footer className="theme-footer mx-4 mb-4 mt-10 rounded-[1.6rem] px-4 py-4 text-center text-xs font-medium tracking-[0.16em]">
        Command Palette: Cmd/Ctrl+K
      </footer>
      <CommandPalette />
    </div>
  );
}
