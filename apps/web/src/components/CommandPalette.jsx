import { useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";

const actions = [
  { id: "resume", label: "Upload Resume", page: "resume", shortcut: "Cmd/Ctrl+1", key: "1" },
  { id: "jobs", label: "Analyze Job", page: "jobs", shortcut: "Cmd/Ctrl+2", key: "2" },
  { id: "versions", label: "View Versions", page: "versions", shortcut: "Cmd/Ctrl+3", key: "3" },
  { id: "versions-export", label: "Export PDF", page: "versions", shortcut: "Cmd/Ctrl+4", key: "4" }
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setActivePage } = useAppStore();

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        const action = actions.find((item) => item.key === key);
        if (action) {
          event.preventDefault();
          setActivePage(action.page);
          setOpen(false);
          return;
        }
      }

      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setActivePage]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-stone-950/30 p-4 pt-24 backdrop-blur-sm">
      <div className="theme-shell w-full max-w-2xl rounded-[2rem] p-4">
        <p className="theme-faint-text px-3 pb-3 text-xs font-semibold uppercase tracking-[0.18em]">Command Palette</p>
        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                setActivePage(action.page);
                setOpen(false);
              }}
              className="theme-nav-pill flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition"
            >
              <span className="text-sm font-semibold">{action.label}</span>
              <span className="theme-faint-text text-xs">{action.shortcut}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
