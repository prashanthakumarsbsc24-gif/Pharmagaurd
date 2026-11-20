import { TriangleAlert } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, action }) {
  return (
    <div className="state state-error" role="alert">
      <TriangleAlert size={28} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div className="state-actions">{action}</div>}
    </div>
  );
}
