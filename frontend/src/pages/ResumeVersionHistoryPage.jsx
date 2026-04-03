import { useEffect, useState } from "react";
import ResumePreviewPanel from "../components/ResumePreviewPanel";
import { useAppStore } from "../store/appStore";
import { useResumeStore } from "../store/resumeStore";

async function fetchVersions(resumeId) {
  const response = await fetch(`/api/resume/${resumeId}/versions`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Failed to load resume versions.");
  return payload.versions;
}

export default function ResumeVersionHistoryPage() {
  const { metadata, parsedResume, versions, setVersions } = useResumeStore();
  const { latestVersionId, setActivePage } = useAppStore();
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!metadata?.resumeId) return;

    let cancelled = false;
    async function loadVersions() {
      try {
        setState("loading");
        const nextVersions = await fetchVersions(metadata.resumeId);
        if (!cancelled) {
          setVersions(nextVersions);
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
  }, [metadata?.resumeId, setVersions]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2f2_100%)] px-4 py-12 text-stone-900">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ResumePreviewPanel parsedResume={parsedResume} metadata={metadata} />
        <section className="space-y-5">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Resume Version History</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">Saved tailored versions</h1>
            <p className="mt-2 text-sm text-stone-500">
              Review each accepted edit batch by role, company, and acceptance stats.
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

          {state === "loading" ? (
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-panel">
              <p className="text-sm text-stone-500">Loading saved versions...</p>
            </div>
          ) : null}

          {versions.map((version) => (
            <article
              key={version.version_id}
              className={`rounded-[2rem] border bg-white p-6 shadow-panel ${
                version.version_id === latestVersionId ? "border-accent shadow-[0_20px_55px_rgba(1,105,111,0.18)]" : "border-stone-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-stone-950">
                    Version {version.metadata.version_number} - {version.metadata.role || "Tailored Resume"}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {version.metadata.company_name || "Unknown company"} - {new Date(version.metadata.timestamp).toLocaleString()}
                  </p>
                </div>
                {version.version_id === latestVersionId ? (
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">Latest</span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Accepted</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">{version.metadata.accepted_count}</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Rejected</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">{version.metadata.rejected_count}</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Job ID</p>
                  <p className="mt-2 text-sm font-semibold text-stone-900">{version.metadata.job_id}</p>
                </div>
              </div>
            </article>
          ))}

          {!versions.length && state !== "loading" ? (
            <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-8 shadow-panel">
              <p className="text-sm leading-7 text-stone-500">
                No tailored resume versions have been saved yet. Apply accepted edits from the diff editor to create the first one.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
