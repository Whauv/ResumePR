import { useEffect, useMemo, useState } from "react";
import DiffCard from "../components/DiffCard";
import EmptyState from "../components/EmptyState";
import SkeletonBlock from "../components/SkeletonBlock";
import { apiFetch } from "../lib/api";
import { useAnalysisStore } from "../store/analysisStore";
import { useAppStore } from "../store/appStore";
import { useJobStore } from "../store/jobStore";
import { useResumeStore } from "../store/resumeStore";

async function fetchSuggestions(resumeId, jobId) {
  const response = await apiFetch("/api/analysis/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, job_id: jobId })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Failed to generate AI suggestions.");
  return payload;
}

async function applyAcceptedEdits(resumeId, acceptedEditIds) {
  const response = await apiFetch("/api/resume/apply-edits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, accepted_edit_ids: acceptedEditIds })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Failed to apply accepted edits.");
  return payload;
}

function useCountUp(target) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId;
    const startTime = performance.now();
    const duration = 600;

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(target * progress);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target]);

  return Math.round(value);
}

function buildSectionLabel(suggestion, resume) {
  if (suggestion.section === "experience") {
    const entry = resume?.experience?.[suggestion.section_index];
    const roleBits = [entry?.title, entry?.company].filter(Boolean).join(" @ ");
    return `Experience - ${roleBits || `Entry ${suggestion.section_index + 1}`}`;
  }
  if (suggestion.section === "summary") {
    return "Summary";
  }
  return "Skills";
}

export default function DiffEditorPage() {
  const { parsedResume, metadata, setUpdatedResumeVersion } = useResumeStore();
  const { parsedJob } = useJobStore();
  const {
    suggestionState,
    suggestionError,
    suggestionResumeId,
    suggestionJobId,
    suggestions,
    decisions,
    setSuggestions,
    setSuggestionState,
    setSuggestionError,
    setDecision,
    setAllDecisions,
    clearSuggestions
  } = useAnalysisStore();
  const { phase4TargetSection, setActivePage, setLatestVersionId } = useAppStore();
  const [applyState, setApplyState] = useState("idle");
  const [applyError, setApplyError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!metadata?.resumeId || !parsedJob?.job_id) {
      return;
    }

    if (
      suggestions.length &&
      suggestionResumeId === metadata.resumeId &&
      suggestionJobId === parsedJob.job_id
    ) {
      return;
    }

    let cancelled = false;
    async function loadSuggestions() {
      try {
        setSuggestionState("loading");
        const payload = await fetchSuggestions(metadata.resumeId, parsedJob.job_id);
        if (!cancelled) setSuggestions(payload);
      } catch (error) {
        if (!cancelled) setSuggestionError(error.message);
      }
    }

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [
    metadata?.resumeId,
    parsedJob?.job_id,
    setSuggestionError,
    setSuggestionState,
    setSuggestions,
    suggestionJobId,
    suggestionResumeId,
    suggestions.length
  ]);

  const sortedSuggestions = useMemo(() => {
    const next = [...suggestions];
    if (!phase4TargetSection) return next;
    return next.sort((left, right) => {
      const leftMatch = left.section === phase4TargetSection ? 1 : 0;
      const rightMatch = right.section === phase4TargetSection ? 1 : 0;
      return rightMatch - leftMatch || right.confidence - left.confidence;
    });
  }, [phase4TargetSection, suggestions]);

  const acceptedIds = sortedSuggestions.filter((suggestion) => decisions[suggestion.id] === "accepted").map((suggestion) => suggestion.id);
  const rejectedCount = sortedSuggestions.filter((suggestion) => decisions[suggestion.id] === "rejected").length;
  const acceptedCount = acceptedIds.length;
  const acceptedCounter = useCountUp(acceptedCount);
  const rejectedCounter = useCountUp(rejectedCount);
  const suggestionCounter = useCountUp(sortedSuggestions.length);

  const summary = useMemo(() => {
    const acceptedSuggestions = sortedSuggestions.filter((suggestion) => decisions[suggestion.id] === "accepted");
    const keywords = [...new Set(acceptedSuggestions.flatMap((suggestion) => suggestion.keywords_added))];
    const sections = [...new Set(acceptedSuggestions.map((suggestion) => suggestion.section))];
    const atsGain = Math.min(24, acceptedSuggestions.length * 4 + keywords.length * 1.5);
    return { keywords, sections, atsGain: Math.round(atsGain) };
  }, [decisions, sortedSuggestions]);

  async function handleApply() {
    if (!acceptedIds.length || !metadata?.resumeId) return;

    try {
      setApplyState("loading");
      const payload = await applyAcceptedEdits(metadata.resumeId, acceptedIds);
      setUpdatedResumeVersion(payload);
      setLatestVersionId(payload.version_id);
      setShowSuccess(true);
      clearSuggestions();
      setTimeout(() => {
        setShowSuccess(false);
        setActivePage("versions");
      }, 900);
    } catch (error) {
      setApplyError(error.message);
      setApplyState("error");
    }
  }

  return (
    <main className="min-h-screen px-4 pb-32 pt-8 text-stone-900">
      <div className="mx-auto max-w-7xl">
        <header className="page-hero sticky top-24 z-10 rounded-[2rem] p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">AI Diff Review</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
                {parsedJob?.job_title || "Targeted resume suggestions"}
              </h1>
              <p className="mt-2 text-sm text-stone-500">
                {suggestionCounter} suggestions - {acceptedCounter} accepted - {rejectedCounter} rejected
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAllDecisions("accepted")}
                className="theme-secondary-button rounded-full px-4 py-3 text-sm font-semibold transition"
              >
                Accept All
              </button>
              <button
                type="button"
                onClick={() => setAllDecisions("rejected")}
                className="theme-secondary-button rounded-full px-4 py-3 text-sm font-semibold transition"
              >
                Reject All
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!acceptedIds.length || applyState === "loading"}
                className="theme-primary-button rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {applyState === "loading" ? "Applying..." : "Apply Accepted Changes"}
              </button>
            </div>
          </div>
          {suggestionError || applyError ? <p className="mt-4 text-sm font-medium text-rose-600">{suggestionError || applyError}</p> : null}
        </header>

        <section className="mt-8 space-y-5">
          {suggestionState === "loading" ? (
            <div className="space-y-4">
              <SkeletonBlock className="h-56 w-full" />
              <SkeletonBlock className="h-56 w-full" />
              <SkeletonBlock className="h-56 w-full" />
            </div>
          ) : null}

          {sortedSuggestions.map((suggestion, index) => (
            <DiffCard
              key={suggestion.id}
              suggestion={suggestion}
              index={index}
              decision={decisions[suggestion.id] || "undecided"}
              label={buildSectionLabel(suggestion, parsedResume)}
              onAccept={() => setDecision(suggestion.id, "accepted")}
              onReject={() => setDecision(suggestion.id, "rejected")}
            />
          ))}

          {!sortedSuggestions.length && suggestionState !== "loading" ? (
            <div className="pt-8">
              <EmptyState
                art="check"
                title="Your resume already matches this job well!"
                description="The AI suggester did not find any high-confidence rewrites to propose for the current resume and job pair."
              />
            </div>
          ) : null}
        </section>
      </div>

      <aside className="fixed bottom-4 left-1/2 z-20 w-[min(1100px,calc(100vw-2rem))] -translate-x-1/2 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Summary Bar</p>
            <p className="mt-2 text-sm text-stone-600">
              Estimated ATS improvement: <strong className="text-stone-900">+{summary.atsGain} points</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.keywords.length ? summary.keywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
                {keyword}
              </span>
            )) : <span className="text-sm text-stone-500">Accept edits to see added keywords.</span>}
          </div>
          <div className="text-sm text-stone-600">
            Sections improved: <strong className="text-stone-900">{summary.sections.length ? summary.sections.join(", ") : "None yet"}</strong>
          </div>
        </div>
      </aside>

      {showSuccess ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="rounded-full bg-accent p-8 text-4xl text-white shadow-[0_20px_70px_rgba(1,105,111,0.35)] animate-ping-once">
            OK
          </div>
        </div>
      ) : null}
    </main>
  );
}
