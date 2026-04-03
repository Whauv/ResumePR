import DiffEditorPage from "./pages/DiffEditorPage";
import JobInputPage from "./pages/JobInputPage";
import ResumeVersionHistoryPage from "./pages/ResumeVersionHistoryPage";
import UploadPage from "./pages/UploadPage";
import { useAppStore } from "./store/appStore";

export default function App() {
  const { activePage, setActivePage } = useAppStore();

  return (
    <div>
      <nav className="sticky top-0 z-20 border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-3 px-4 py-4">
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
      </nav>
      {activePage === "resume" ? <UploadPage /> : null}
      {activePage === "jobs" ? <JobInputPage /> : null}
      {activePage === "diff" ? <DiffEditorPage /> : null}
      {activePage === "versions" ? <ResumeVersionHistoryPage /> : null}
    </div>
  );
}
