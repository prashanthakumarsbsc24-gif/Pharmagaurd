import { STATUSES } from '../utils/inventory';

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`} title={STATUSES[status].hint}>
      <span className="badge-dot" aria-hidden="true" />
      {STATUSES[status].label}
    </span>
  );
}
