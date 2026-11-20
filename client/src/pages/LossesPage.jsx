import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import SearchBox from '../components/SearchBox';
import ConfirmDialog from '../components/ConfirmDialog';
import { EmptyState, LoadingState } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { formatDate, relativeDays } from '../utils/dates';

export default function LossesPage() {
  const { items, summary, status, removeBatch } = useInventory();
  const { region, money } = useAuth();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [request, setRequest] = useState(null);

  const expired = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.status === 'expired')
      .filter((i) => !q || `${i.medicationName} ${i.batchNumber}`.toLowerCase().includes(q))
      .sort((a, b) => b.value - a.value || a.daysLeft - b.daysLeft);
  }, [items, query]);

  const writeOff = (b) => setRequest({
    title: 'Write off this stock?',
    body: `${b.medicationName} (lot ${b.batchNumber}) will be removed and a loss of ${money.format(b.value)} recorded in the audit trail.`,
    confirmLabel: 'Write off', tone: 'danger',
    onConfirm: async () => {
      try { await removeBatch(b.id, 'write-off'); toast.success(`${b.medicationName} written off.`); }
      catch (err) { toast.error(err.message); }
    },
  });

  const columns = [
    { id: 'name', header: 'Medication', cell: (r) => <span className="cell-title">{r.medicationName}</span> },
    { id: 'lot', header: 'Lot', cell: (r) => <code className="lot">{r.batchNumber}</code> },
    { id: 'price', header: 'Unit price', align: 'right', cell: (r) => money.format(r.price) },
    { id: 'qty', header: 'Expired units', align: 'right', cell: (r) => money.number(r.quantity) },
    { id: 'exp', header: 'Expired on', cell: (r) => (<><span className="cell-title">{formatDate(r.expirationDate, region.locale)}</span><span className="cell-sub">{relativeDays(r.daysLeft)}</span></>) },
    { id: 'loss', header: 'Loss', align: 'right', cell: (r) => <span className="loss">{r.value > 0 ? `−${money.format(r.value)}` : money.format(0)}</span> },
    { id: 'act', header: <span className="sr-only">Action</span>, align: 'right', cell: (r) => <button className="btn btn-secondary btn-sm" onClick={() => writeOff(r)}>Write off</button> },
  ];

  if (status === 'loading') return <LoadingState />;

  return (
    <>
      <PageHeader title="Losses" description="Capital tied up in expired stock, and the write-offs that clear it." />
      <section className="panel kpis kpis-2" aria-label="Loss totals">
        <div className="kpi"><span>Capital lost to expiry</span><strong className="loss">{summary.expiredLoss > 0 ? '−' : ''}{money.compact(summary.expiredLoss)}</strong><small>{money.format(summary.expiredLoss)}</small></div>
        <div className="kpi"><span>Expired units</span><strong>{money.number(summary.expiredUnits)}</strong><small>Across {money.number(summary.counts.expired)} batches</small></div>
      </section>

      {summary.unpricedExpired > 0 && (
        <p className="notice" role="note">
          <TriangleAlert size={18} aria-hidden="true" />
          <span>{money.number(summary.unpricedExpired)} expired {summary.unpricedExpired === 1 ? 'batch has' : 'batches have'} no price, so the loss above is understated. Edit a batch from the Overview, or re-import a CSV that includes a price column.</span>
        </p>
      )}

      <section className="panel register">
        <div className="toolbar">
          <h2>Write-off schedule</h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search medicine or lot" label="Search expired stock" />
        </div>
        <DataTable key={query} columns={columns} rows={expired} caption="Expired stock" empty={<EmptyState title="No expired stock" message="Nothing has passed its expiry date." />} />
      </section>
      <ConfirmDialog request={request} onClose={() => setRequest(null)} />
    </>
  );
}
