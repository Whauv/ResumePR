import { useState } from "react";

export default function CollapsibleCard({ title, subtitle, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="glass-card overflow-hidden rounded-[2rem]">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
        </div>
        <span className="rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>
      {isOpen ? <div className="border-t border-white/60 px-6 py-5">{children}</div> : null}
    </section>
  );
}
