import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { EmptyState, LoadingState } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { formatDate, relativeDays } from '../utils/dates';
import { DISPOSAL_AFTER_DAYS } from '../utils/inventory';

export default function ExpiredPage() {
  const { items, status, removeBatch } = useInventory();
  const { region, money } = useAuth();
  const toast = useToast();
  const [request, setRequest] = useState(null);

  const rows = useMemo(
    () => items.filter((i) => i.daysLeft < -DISPOSAL_AFTER_DAYS).sort((a, b) => a.daysLeft - b.daysLeft),
    [items]
  );
  const units = rows.reduce((n, r) => n + r.quantity, 0);

  const dispose = (b) => setRequest({
    title: 'Log disposal?',
    body: `Confirm ${b.medicationName} (lot ${b.batchNumber}, ${money.number(b.quantity)} units) has been destroyed. The batch is removed and the disposal is recorded in the audit trail.`,
    confirmLabel: 'Log disposal', tone: 'danger',
    onConfirm: async () => {
      try { await removeBatch(b.id, 'disposal'); toast.success(`Disposal logged for ${b.medicationName}.`); }
      catch (err) { toast.error(err.message); }
    },
  });

  const columns = [
    { id: 'name', header: 'Medication', cell: (r) => <span className="cell-title">{r.medicationName}</span> },
    { id: 'lot', header: 'Lot', cell: (r) => <code className="lot">{r.batchNumber}</code> },
    { id: 'qty', header: 'Units', align: 'right', cell: (r) => money.number(r.quantity) },
    { id: 'exp', header: 'Expired on', cell: (r) => formatDate(r.expirationDate, region.locale) },
    { id: 'days', header: 'Time expired', cell: (r) => <strong className="loss">{relativeDays(r.daysLeft).replace(' ago', '')}</strong> },
    { id: 'act', header: <span className="sr-only">Action</span>, align: 'right', cell: (r) => <button className="btn btn-secondary btn-sm" onClick={() => dispose(r)}>Log disposal</button> },
  ];

  if (status === 'loading') return <LoadingState />;

  return (
    <>
      <PageHeader title="Disposal queue" description="Batches expired for more than a year. Destroy them under your regulator’s rules, then log the disposal." />
      <section className="panel kpis kpis-2" aria-label="Disposal totals">
        <div className="kpi"><span>Batches awaiting disposal</span><strong>{money.number(rows.length)}</strong><small>Expired over 1 year</small></div>
        <div className="kpi"><span>Units to destroy</span><strong>{money.number(units)}</strong><small>Across all queued batches</small></div>
      </section>
      <section className="panel register">
        <DataTable columns={columns} rows={rows} caption="Disposal queue" empty={<EmptyState title="Disposal queue is clear" message="No batch has been expired for more than a year." />} />
      </section>
      <ConfirmDialog request={request} onClose={() => setRequest(null)} />
    </>
  );
}
