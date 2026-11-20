// How much of the next 12 months of shelf life is left. Expired batches show as a full red bar.
export default function ShelfMeter({ daysLeft, status }) {
  const pct = daysLeft < 0 ? 100 : Math.max(4, Math.min(100, (daysLeft / 365) * 100));
  const label = daysLeft < 0 ? 'Expired' : `${daysLeft} days of shelf life left`;
  return (
    <div className="meter" role="img" aria-label={label}>
      <div className={`meter-fill meter-${status}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
