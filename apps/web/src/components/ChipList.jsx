const TONE_STYLES = {
  accent: "border-accent/20 bg-accent/10 text-accent",
  muted: "border-stone-200 bg-stone-100 text-stone-700",
  matched: "border-emerald-200 bg-emerald-50 text-emerald-700",
  missing: "border-rose-200 bg-rose-50 text-rose-700"
};

/** Shared pill/chip list. `tone` picks the color variant; `emptyLabel` renders
 *  when there are no items. */
export default function ChipList({ items, tone = "muted", emptyLabel = "None here." }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.muted;

  if (!items?.length) {
    return <p className="text-sm text-stone-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-3 py-2 text-sm font-medium ${styles}`}>
          {item}
        </span>
      ))}
    </div>
  );
}
