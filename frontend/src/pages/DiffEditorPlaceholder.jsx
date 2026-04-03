import { useAppStore } from "../store/appStore";

export default function DiffEditorPlaceholder() {
  const { phase4TargetSection, setActivePage } = useAppStore();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(1,105,111,0.12),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f2_100%)] px-4 py-12 text-stone-900">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-stone-200 bg-white p-10 shadow-panel">
        <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
          Phase 4 Prep
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950">Diff editor handoff is staged.</h1>
        <p className="mt-4 text-base leading-7 text-stone-600">
          The gap analysis selected <strong>{phase4TargetSection || "a section"}</strong> as the next section to fix.
          This placeholder keeps the section intent ready for the next phase, where we will open the accept/reject diff editor directly on that area.
        </p>
        <button
          type="button"
          onClick={() => setActivePage("jobs")}
          className="mt-6 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          Back to Gap Analysis
        </button>
      </div>
    </main>
  );
}
