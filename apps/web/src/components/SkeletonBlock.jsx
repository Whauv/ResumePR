export default function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton-shimmer rounded-[1.6rem] border border-white/60 bg-stone-200/70 ${className}`} />;
}
