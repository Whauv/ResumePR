import { useEffect } from "react";
import DiffEditorPage from "./pages/DiffEditorPage";
import JobInputPage from "./pages/JobInputPage";
import ResumeVersionHistoryPage from "./pages/ResumeVersionHistoryPage";
import UploadPage from "./pages/UploadPage";
import { useAppStore } from "./store/appStore";
import { useResumeStore } from "./store/resumeStore";

async function fetchVersionSummaries(resumeId) {
  const response = await fetch(`/api/versions/${resumeId}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Failed to load version summaries.");
  return payload.versions;
}

async function fetchFullVersions(resumeId) {
  const response = await fetch(`/api/resume/${resumeId}/versions`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Failed to load full versions.");
  return payload.versions;
}

function formatHeaderDate(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function App() {
  const { activePage, latestVersionId, setActivePage, setLatestVersionId } = useAppStore();
  const { metadata, versions, versionSummaries, restoreVersion, setVersions, setVersionSummaries } = useResumeStore();
  const activeVersion = versionSummaries.find((item) => item.version_id === latestVersionId) || versionSummaries[0] || null;

  useEffect(() => {
    if (!metadata?.resumeId) return;
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
  }, [metadata?.resumeId, setVersionSummaries, setVersions, versionSummaries.length, versions.length]);

  return (
    <div>
      <nav className="sticky top-0 z-20 border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActivePage("resume")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activePage === "resume" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              Resume Upload
            </button>
            <button
              type="button"
              onClick={() => setActivePage("jobs")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activePage === "jobs" ? "bg-accent text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              Job Intake
            </button>
            <button
              type="button"
              onClick={() => setActivePage("diff")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activePage === "diff" ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              Diff Editor
            </button>
            <button
              type="button"
              onClick={() => setActivePage("versions")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activePage === "versions" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              Version History
            </button>
          </div>

          <details className="group relative">
            <summary className="list-none rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
              {activeVersion
                ? `v${activeVersion.version_number} - ${activeVersion.company_name || activeVersion.job_title} (${formatHeaderDate(activeVersion.timestamp)})`
                : "No active version"}
            </summary>
            {versionSummaries.length ? (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-stone-200 bg-white p-3 shadow-panel">
                {versionSummaries.map((version) => (
                  <button
                    key={version.version_id}
                    type="button"
                    onClick={() => {
                      setLatestVersionId(version.version_id);
                      restoreVersion(version.version_id);
                    }}
                    className="flex w-full flex-col rounded-2xl px-3 py-3 text-left transition hover:bg-stone-50"
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
        </div>
      </nav>
      {activePage === "resume" ? <UploadPage /> : null}
      {activePage === "jobs" ? <JobInputPage /> : null}
      {activePage === "diff" ? <DiffEditorPage /> : null}
      {activePage === "versions" ? <ResumeVersionHistoryPage /> : null}
    </div>
  );
}
