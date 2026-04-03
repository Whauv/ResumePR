import { useState } from "react";

export default function CollapsibleCard({ title, subtitle, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-panel">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
        </div>
        <span className="text-sm font-medium text-accent">{isOpen ? "Hide" : "Show"}</span>
      </button>
      {isOpen ? <div className="border-t border-stone-100 px-6 py-5">{children}</div> : null}
    </section>
  );
}
