import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import ExportModal from "../components/ExportModal";
import ResumePreviewPanel from "../components/ResumePreviewPanel";
import { useAppStore } from "../store/appStore";
import { useResumeStore } from "../store/resumeStore";

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

async function fetchVersionDiff(versionId) {
  const response = await apiFetch(`/api/versions/${versionId}/diff`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Failed to load version diff.");
  return payload;
}

function relativeTime(timestamp) {
  const now = Date.now();
  const diffMs = now - new Date(timestamp).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
}

function CompareModal({ diff, onClose }) {
  if (!diff) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.25)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Compare Versions</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">Exact changes from the previous version</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700">
            Close
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {diff.changes.length ? (
            diff.changes.map((change, index) => (
              <article key={`${change.section}-${change.field}-${index}`} className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  {change.section} - {change.field}
                </p>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-rose-100 bg-[#fff5f5] p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">Before</p>
                    <p className="text-sm leading-7 text-stone-700">{change.before || "No previous value"}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-[#f0fff4] p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">After</p>
                    <p className="text-sm leading-7 text-stone-700">{change.after || "Removed"}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-stone-500">No differences were found for this version.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResumeVersionHistoryPage() {
  const { metadata, parsedResume, versions, versionSummaries, setVersions, setVersionSummaries, restoreVersion } = useResumeStore();
  const { latestVersionId, setActivePage, setLatestVersionId } = useAppStore();
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [diffState, setDiffState] = useState("idle");
  const [diffData, setDiffData] = useState(null);
  const [exportVersionId, setExportVersionId] = useState("");
  const [exportFormat, setExportFormat] = useState("pdf");

  useEffect(() => {
    if (!metadata?.resumeId) return;

    let cancelled = false;
    async function loadVersions() {
      try {
        setState("loading");
        const [summaryList, fullList] = await Promise.all([
          fetchVersionSummaries(metadata.resumeId),
          fetchFullVersions(metadata.resumeId)
        ]);
        if (!cancelled) {
          setVersionSummaries(summaryList);
          setVersions(fullList);
          setState("success");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setState("error");
        }
      }
    }

    loadVersions();
    return () => {
      cancelled = true;
    };
  }, [metadata?.resumeId, setVersionSummaries, setVersions]);

  const fullVersionMap = useMemo(
    () => new Map(versions.map((version) => [version.version_id, version])),
    [versions]
  );
  const exportVersion = exportVersionId ? fullVersionMap.get(exportVersionId) : null;

  async function handleCompare(versionId) {
    try {
      setDiffState("loading");
      const payload = await fetchVersionDiff(versionId);
      setDiffData(payload);
      setDiffState("success");
    } catch (loadError) {
      setError(loadError.message);
      setDiffState("error");
    }
  }

  function handleRestore(versionId) {
    const version = fullVersionMap.get(versionId);
    if (!version) return;
    const confirmed = window.confirm(`Restore version ${version.metadata.version_number} as the active resume?`);
    if (!confirmed) return;
    restoreVersion(versionId);
    setLatestVersionId(versionId);
  }

  return (
    <main className="min-h-screen px-4 py-12 text-stone-900">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <ResumePreviewPanel parsedResume={parsedResume} metadata={metadata} />
        <section className="space-y-5">
          <div className="page-hero rounded-[2rem] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Resume Version History</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">Timeline of tailored resumes</h1>
            <p className="mt-2 text-sm text-stone-500">
              Compare versions, restore a prior draft, or export any tailored resume to PDF or DOCX.
            </p>
            <button
              type="button"
              onClick={() => setActivePage("diff")}
              className="mt-5 rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Back to Diff Editor
            </button>
            {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
          </div>

          <div className="relative pl-6">
            <div className="absolute left-[11px] top-0 h-full w-px bg-stone-200" />
            <div className="space-y-5">
              {state === "loading" ? (
                <div className="glass-card rounded-[2rem] p-8">
                  <p className="text-sm text-stone-500">Loading saved versions...</p>
                </div>
              ) : null}

              {versionSummaries.map((version) => {
                const delta = Math.round((version.ats_score_after || 0) - (version.ats_score_before || 0));
                return (
                  <article
                    key={version.version_id}
                    className={`relative rounded-[2rem] border bg-white p-6 shadow-panel ${
                      version.version_id === latestVersionId ? "border-accent shadow-[0_20px_55px_rgba(1,105,111,0.18)]" : "border-white/70"
                    }`}
                  >
                    <div className="absolute -left-[22px] top-8 h-4 w-4 rounded-full border-4 border-white bg-accent shadow" />
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-stone-950">
                          v{version.version_number} - {version.company_name || "Unknown company"} - {version.job_title || "Target role"}
                        </h2>
                        <p className="mt-1 text-sm text-stone-500">{relativeTime(version.timestamp)}</p>
                      </div>
                      {version.version_id === latestVersionId ? (
                        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">Active</span>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">ATS Score</p>
                        <p className="mt-2 text-lg font-semibold text-stone-900">
                          {Math.round(version.ats_score_before)} to {Math.round(version.ats_score_after)} {delta >= 0 ? `+${delta}` : delta}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Accepted Edits</p>
                        <p className="mt-2 text-lg font-semibold text-stone-900">{version.accepted_edits_count}</p>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Created</p>
                        <p className="mt-2 text-sm font-semibold text-stone-900">
                          {new Date(version.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setLatestVersionId(version.version_id);
                          restoreVersion(version.version_id);
                        }}
                        className="rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompare(version.version_id)}
                        className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-700 border border-stone-200"
                      >
                        Compare
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportFormat("pdf");
                          setExportVersionId(version.version_id);
                        }}
                        className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-700 border border-stone-200"
                      >
                        Export PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportFormat("docx");
                          setExportVersionId(version.version_id);
                        }}
                        className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-700 border border-stone-200"
                      >
                        Export DOCX
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestore(version.version_id)}
                        className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white"
                      >
                        Restore
                      </button>
                    </div>
                  </article>
                );
              })}

              {!versionSummaries.length && state !== "loading" ? (
                <div className="glass-card rounded-[2rem] border border-dashed border-stone-300/70 p-8">
                  <p className="text-sm leading-7 text-stone-500">
                    No tailored resume versions have been saved yet. Apply accepted edits from the diff editor to create the first one.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {diffState === "loading" ? (
        <div className="fixed bottom-4 right-4 rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-panel">
          Loading comparison...
        </div>
      ) : null}

      <CompareModal diff={diffData} onClose={() => setDiffData(null)} />
      <ExportModal version={exportVersion} initialFormat={exportFormat} onClose={() => setExportVersionId("")} />
    </main>
  );
}
