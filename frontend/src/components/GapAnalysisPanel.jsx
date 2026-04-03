import { useEffect, useState } from "react";

function useCountUp(target) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId;
    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      setValue(target * progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target]);

  return value;
}

function ProgressRing({ value }) {
  const animatedValue = useCountUp(value);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (animatedValue / 100) * circumference;

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#d6d3d1" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#01696f"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-stone-950">{Math.round(animatedValue)}</span>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">ATS Match</span>
      </div>
    </div>
  );
}

function MiniBar({ value }) {
  const animatedValue = useCountUp(value);
  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="analysis-progress-fill h-full rounded-full bg-accent"
          style={{ "--analysis-progress": animatedValue }}
        />
      </div>
      <p className="analysis-progress-text text-sm font-medium text-stone-600">{Math.round(animatedValue)}%</p>
    </div>
  );
}

function ChipList({ items, tone }) {
  const className =
    tone === "missing"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  if (!items?.length) {
    return <p className="text-sm text-stone-500">None flagged here.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-3 py-2 text-sm font-medium ${className}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function SectionCard({ title, report, onFix }) {
  return (
    <article className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-950">{title}</h3>
          <p className="mt-1 text-sm text-stone-500">Matched and missing signals for this section.</p>
        </div>
        <div className="min-w-28">
          <MiniBar value={report.score} />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Matched Keywords</p>
          <ChipList items={report.matched} tone="matched" />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Missing Keywords</p>
          <ChipList items={report.missing} tone="missing" />
        </div>
      </div>

      <button
        type="button"
        onClick={onFix}
        className="mt-5 rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
      >
        Fix These Now
      </button>
    </article>
  );
}

export default function GapAnalysisPanel({ report, analysisState, analysisError, onAnalyze, onFixSection }) {
  if (!report) {
    return (
      <section className="rounded-[2rem] border border-dashed border-stone-300 bg-white/90 p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-stone-950">Skills Gap Analysis</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-stone-600">
          Upload a resume and parse a job description, then run the gap analysis to see matched and missing keywords by section.
        </p>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={analysisState === "loading"}
          className="mt-5 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#01575c] disabled:opacity-70"
        >
          {analysisState === "loading" ? "Analyzing..." : "Run Skills Gap Analysis"}
        </button>
        {analysisError ? <p className="mt-4 text-sm font-medium text-rose-600">{analysisError}</p> : null}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <article className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Gap Analysis</p>
        <div className="mt-5">
          <ProgressRing value={report.overall_score} />
        </div>
        {analysisError ? <p className="mt-4 text-sm font-medium text-rose-600">{analysisError}</p> : null}
      </article>

      <SectionCard title="Skills" report={report.sections.skills} onFix={() => onFixSection("skills")} />
      <SectionCard title="Experience" report={report.sections.experience} onFix={() => onFixSection("experience")} />
      <SectionCard title="Summary" report={report.sections.summary} onFix={() => onFixSection("summary")} />

      <article className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-panel">
        <h3 className="text-lg font-semibold text-stone-950">Top 10 Missing Keywords</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {report.top_missing_keywords.length ? (
            report.top_missing_keywords.map((item, index) => (
              <span
                key={item}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
              >
                {index + 1}. {item}
              </span>
            ))
          ) : (
            <p className="text-sm text-stone-500">No major gaps detected.</p>
          )}
        </div>
      </article>

      <article className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-panel">
        <h3 className="text-lg font-semibold text-stone-950">ATS Red Flags</h3>
        <div className="mt-4 space-y-3">
          {report.ats_red_flags.length ? (
            report.ats_red_flags.map((flag) => (
              <div key={flag} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {flag}
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-500">No obvious ATS red flags were found.</p>
          )}
        </div>
      </article>
    </section>
  );
}
