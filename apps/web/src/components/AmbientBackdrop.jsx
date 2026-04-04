export default function AmbientBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="ambient-grid absolute inset-0 opacity-60" />
      <div className="ambient-orb ambient-orb-left" />
      <div className="ambient-orb ambient-orb-right" />
      <div className="ambient-spotlight" />
      <div className="ambient-noise absolute inset-0 opacity-20" />
    </div>
  );
}
