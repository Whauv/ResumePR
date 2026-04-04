export default function EmptyState({ title, description, art = "arrow" }) {
  const glyph = art === "compass" ? "N" : art === "check" ? "OK" : "->";
  return (
    <div className="glass-card rounded-[2rem] border border-dashed border-stone-300/70 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-accent/15 bg-accent/10 text-xl font-bold text-accent shadow-[0_16px_32px_rgba(1,105,111,0.12)]">
        {glyph}
      </div>
      <h3 className="mt-4 text-xl font-semibold text-stone-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-stone-500">{description}</p>
    </div>
  );
}
