import { useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";

const actions = [
  { id: "resume", label: "Upload Resume", page: "resume" },
  { id: "jobs", label: "Analyze Job", page: "jobs" },
  { id: "versions", label: "View Versions", page: "versions" },
  { id: "versions-export", label: "Export PDF", page: "versions" }
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setActivePage } = useAppStore();

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-stone-950/30 p-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-stone-200 bg-white p-4 shadow-[0_20px_70px_rgba(15,23,42,0.22)]">
        <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Command Palette</p>
        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                setActivePage(action.page);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-stone-50"
            >
              <span className="text-sm font-semibold text-stone-900">{action.label}</span>
              <span className="text-xs text-stone-400">Cmd/Ctrl+K</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
