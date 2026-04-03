import { useEffect, useState } from "react";
import CollapsibleCard from "../components/CollapsibleCard";
import EmptyState from "../components/EmptyState";
import GapAnalysisPanel from "../components/GapAnalysisPanel";
import JobSummaryPanel from "../components/JobSummaryPanel";
import ResumePreviewPanel from "../components/ResumePreviewPanel";
import SkeletonBlock from "../components/SkeletonBlock";
import { apiFetch } from "../lib/api";
import { useAnalysisStore } from "../store/analysisStore";
import { useAppStore } from "../store/appStore";
import { useJobStore } from "../store/jobStore";
import { useResumeStore } from "../store/resumeStore";

const tabs = [
  { id: "url", label: "Paste URL" },
  { id: "text", label: "Paste Text" },
  { id: "extension", label: "From Extension" }
];

async function parseJob(body) {
  const response = await apiFetch("/api/jobs/parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || "Failed to analyze job description.");
  }
  return payload;
}

async function fetchLatestExtensionJob() {
  const response = await apiFetch("/api/jobs/latest/from-extension");
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || "No extension job found yet.");
  }
  return payload;
}

async function runGapAnalysis(resumeId, jobId) {
  const response = await apiFetch("/api/analysis/gap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ resume_id: resumeId, job_id: jobId })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || "Failed to analyze the resume gap.");
  }
  return payload;
}

export default function JobInputPage() {
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [extensionStatus, setExtensionStatus] = useState("checking");
  const {
    activeTab,
    jobState,
    jobError,
    parsedJob,
    setActiveTab,
    setJobState,
    setJobError,
    setParsedJob,
    setExtensionJobId
  } = useJobStore();
  const { parsedResume, metadata } = useResumeStore();
  const { analysis, analysisState, analysisError, setAnalysis, setAnalysisState, setAnalysisError } = useAnalysisStore();
  const { setActivePage, setPhase4TargetSection } = useAppStore();

  useEffect(() => {
    let cancelled = false;

    async function probeExtensionJob() {
      try {
        const payload = await fetchLatestExtensionJob();
        if (!cancelled) {
          setExtensionJobId(payload.job_id);
          setExtensionStatus("ready");
        }
      } catch (_error) {
        if (!cancelled) {
          setExtensionStatus("empty");
        }
      }
    }

    probeExtensionJob();
    return () => {
      cancelled = true;
    };
  }, [setExtensionJobId]);

  async function handleAnalyze(body) {
    try {
      setJobState("loading");
      const payload = await parseJob(body);
      setParsedJob(payload);
      setExtensionJobId(payload.job_id);
      setExtensionStatus("ready");
    } catch (error) {
      setJobError(error.message);
    }
  }

  async function handleLoadFromExtension() {
    try {
      setJobState("loading");
      const payload = await fetchLatestExtensionJob();
      setParsedJob(payload);
      setExtensionJobId(payload.job_id);
      setExtensionStatus("ready");
    } catch (error) {
      setJobError(error.message);
    }
  }

  async function handleRunGapAnalysis() {
    if (!metadata?.resumeId || !parsedJob?.job_id) {
      setAnalysisError("Upload a resume and analyze a job before running the skills gap report.");
      return;
    }

    try {
      setAnalysisState("loading");
      const payload = await runGapAnalysis(metadata.resumeId, parsedJob.job_id);
      setAnalysis(payload);
    } catch (error) {
      setAnalysisError(error.message);
    }
  }

  function handleFixSection(section) {
    setPhase4TargetSection(section);
    setActivePage("diff");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(1,105,111,0.12),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f2_100%)] px-4 py-12 text-stone-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="space-y-6">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              Job Description Intake
            </span>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-stone-950">
              Pull job requirements from a URL, raw text, or the Chrome extension.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-600">
              This phase creates the ingestion layer that will feed future resume diffs, skill gap
              breakdowns, and versioned tailoring workflows.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <CollapsibleCard title="Analyze Job Description" subtitle="Use one of the three intake modes below.">
              <div className="flex flex-wrap gap-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeTab === tab.id ? "bg-accent text-white" : "bg-white text-stone-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "url" ? (
                <div className="mt-4 space-y-4">
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="Paste a job posting URL"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-accent focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleAnalyze({ url })}
                    disabled={jobState === "loading"}
                    className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#01575c] disabled:opacity-70"
                  >
                    {jobState === "loading" ? "Analyzing..." : "Analyze URL"}
                  </button>
                </div>
              ) : null}

              {activeTab === "text" ? (
                <div className="mt-4 space-y-4">
                  <textarea
                    value={rawText}
                    onChange={(event) => setRawText(event.target.value)}
                    rows={12}
                    placeholder="Paste the full job description text"
                    className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm outline-none transition focus:border-accent focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleAnalyze({ raw_text: rawText })}
                    disabled={jobState === "loading"}
                    className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#01575c] disabled:opacity-70"
                  >
                    {jobState === "loading" ? "Analyzing..." : "Analyze Text"}
                  </button>
                </div>
              ) : null}

              {activeTab === "extension" ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-sm font-semibold text-stone-900">Extension status</p>
                    <p className="mt-2 text-sm text-stone-600">
                      {extensionStatus === "checking" && "Checking for a recently synced job description..."}
                      {extensionStatus === "ready" && "A job description is ready to load from the extension flow."}
                      {extensionStatus === "empty" && "No extension data found yet. Send one from the popup first."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadFromExtension}
                    disabled={jobState === "loading" || extensionStatus !== "ready"}
                    className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-70"
                  >
                    {jobState === "loading" ? "Loading..." : "Load"}
                  </button>
                </div>
              ) : null}

              {jobError ? <p className="mt-4 text-sm font-medium text-rose-600">{jobError}</p> : null}
            </CollapsibleCard>

            <CollapsibleCard title="Run Analysis" subtitle="Generate the differentiating per-section gap breakdown.">
              <div className="space-y-4">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                  Resume ready: <strong>{metadata?.resumeId ? "Yes" : "No"}</strong>
                  <br />
                  Job ready: <strong>{parsedJob?.job_id ? "Yes" : "No"}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleRunGapAnalysis}
                  disabled={analysisState === "loading"}
                  className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-70"
                >
                  {analysisState === "loading" ? "Running analysis..." : "Run Skills Gap Analysis"}
                </button>
              </div>
            </CollapsibleCard>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr_0.9fr]">
          <ResumePreviewPanel parsedResume={parsedResume} metadata={metadata} />
          <GapAnalysisPanel
            report={analysis?.report || null}
            analysisState={analysisState}
            analysisError={analysisError}
            onAnalyze={handleRunGapAnalysis}
            onFixSection={handleFixSection}
          />
          {jobState === "loading" ? (
            <div className="space-y-4">
              <SkeletonBlock className="h-48 w-full" />
              <SkeletonBlock className="h-36 w-full" />
            </div>
          ) : parsedJob ? (
            <JobSummaryPanel parsedJob={parsedJob} />
          ) : (
            <EmptyState
              art="compass"
              title="Paste a job URL to begin"
              description="Analyze a URL, raw text, or extension payload to populate the target job summary."
            />
          )}
        </section>
      </div>
    </main>
  );
}
