export default function EmptyState({ title, description, art = "arrow" }) {
  const glyph = art === "compass" ? "N" : art === "check" ? "OK" : "^";
  return (
    <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-8 text-center shadow-panel">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-2xl font-bold text-accent">
        {glyph}
      </div>
      <h3 className="mt-4 text-xl font-semibold text-stone-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-stone-500">{description}</p>
    </div>
  );
}
