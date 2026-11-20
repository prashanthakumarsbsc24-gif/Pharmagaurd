import { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import SearchBox from '../components/SearchBox';
import StatusBadge from '../components/StatusBadge';
import ShelfMeter from '../components/ShelfMeter';
import BatchDialog from '../components/BatchDialog';
import ImportDialog from '../components/ImportDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { formatDate, relativeDays } from '../utils/dates';
import { exportInventory } from '../utils/exports';
import { LOW_STOCK_THRESHOLD, STATUS_ORDER, STATUSES } from '../utils/inventory';

const SORTS = {
  urgency: { label: 'Most urgent first', fn: (a, b) => rank(a) - rank(b) },
  name: { label: 'Name A–Z', fn: (a, b) => a.medicationName.localeCompare(b.medicationName) },
  value: { label: 'Highest stock value', fn: (a, b) => b.value - a.value },
  quantity: { label: 'Lowest stock', fn: (a, b) => a.quantity - b.quantity },
};
// In-date batches by days left, then expired ones with the most recently expired first.
const rank = (i) => (i.daysLeft >= 0 ? i.daysLeft : 1e6 + Math.abs(i.daysLeft));

export default function OverviewPage() {
  const { items, summary, status, error } = useInventory();
  const { region, money } = useAuth();
  const { addBatch, updateBatch, removeBatch } = useInventory();
  const toast = useToast();

  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('urgency');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new batch, object = edit
  const [importing, setImporting] = useState(false);
  const [removal, setRemoval] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => filter === 'all' || i.status === filter)
      .filter((i) => !q || `${i.medicationName} ${i.batchNumber} ${i.storage}`.toLowerCase().includes(q))
      .sort(SORTS[sort].fn);
  }, [items, filter, query, sort]);

  const nextToExpire = useMemo(
    () => items.filter((i) => i.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 6),
    [items]
  );

  const save = async (data) => {
    if (editing) {
      await updateBatch(editing.id, data);
      toast.success(`${data.medicationName} updated.`);
    } else {
      await addBatch(data);
      toast.success(`${data.medicationName} added.`);
    }
  };

  const askRemove = (b) => setRemoval({
    title: 'Remove this batch?',
    body: `${b.medicationName} (lot ${b.batchNumber}, ${money.number(b.quantity)} units) will be deleted from your stock. The removal is recorded in the audit trail.`,
    confirmLabel: 'Remove batch',
    tone: 'danger',
    onConfirm: async () => {
      try { await removeBatch(b.id, 'remove'); toast.success(`${b.medicationName} removed.`); }
      catch (err) { toast.error(err.message); }
    },
  });

  const columns = [
    { id: 'name', header: 'Medication', cell: (r) => (<><span className="cell-title">{r.medicationName}</span><span className="cell-sub">{r.storage}</span></>) },
    { id: 'lot', header: 'Lot', cell: (r) => <code className="lot">{r.batchNumber}</code> },
    { id: 'price', header: 'Price', align: 'right', cell: (r) => money.format(r.price) },
    { id: 'stock', header: 'Stock', align: 'right', cell: (r) => (
      <span className={r.status !== 'expired' && r.quantity < LOW_STOCK_THRESHOLD ? 'stock-low' : undefined}>{money.number(r.quantity)}</span>
    ) },
    { id: 'expiry', header: 'Expires', cell: (r) => (<><span className="cell-title">{formatDate(r.expirationDate, region.locale)}</span><span className="cell-sub">{relativeDays(r.daysLeft)}</span></>) },
    { id: 'life', header: 'Shelf life', cell: (r) => <ShelfMeter daysLeft={r.daysLeft} status={r.status} /> },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { id: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', cell: (r) => (
      <div className="row-actions">
        <button className="icon-btn" onClick={() => setEditing(r)} aria-label={`Edit ${r.medicationName}`} title="Edit"><Pencil size={16} /></button>
        <button className="icon-btn icon-btn-danger" onClick={() => askRemove(r)} aria-label={`Remove ${r.medicationName}`} title="Remove"><Trash2 size={16} /></button>
      </div>
    ) },
  ];

  const actions = (
    <>
      <button className="btn btn-secondary" onClick={() => exportInventory(items, money.currency)} disabled={!items.length}><Download size={16} />Export</button>
      <button className="btn btn-secondary" onClick={() => setImporting(true)}><Upload size={16} />Import CSV</button>
      <button className="btn btn-primary" onClick={() => setEditing(null)}><Plus size={16} />Add batch</button>
    </>
  );

  const dialogs = (
    <>
      <BatchDialog open={editing !== undefined} batch={editing ?? null} onClose={() => setEditing(undefined)} onSave={save} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
      <ConfirmDialog request={removal} onClose={() => setRemoval(null)} />
    </>
  );

  if (status === 'loading') return <LoadingState label="Loading your inventory…" />;
  if (status === 'error') return <ErrorState message={error} />;

  if (summary.total === 0) {
    return (
      <>
        <PageHeader title="Overview" description="Every batch, rated against today’s date." />
        <div className="panel">
          <EmptyState title="No batches yet"
            message="Add your first batch or import a CSV, and PharmaGuard will start tracking what expires and what it costs."
            action={<><button className="btn btn-primary" onClick={() => setEditing(null)}><Plus size={16} />Add batch</button>
              <button className="btn btn-secondary" onClick={() => setImporting(true)}><Upload size={16} />Import CSV</button></>} />
        </div>
        {dialogs}
      </>
    );
  }

  const { counts } = summary;
  const headline = summary.atRiskCount > 0
    ? `${money.number(summary.atRiskCount)} ${summary.atRiskCount === 1 ? 'batch expires' : 'batches expire'} within 90 days`
    : 'Nothing expires within the next 90 days';

  return (
    <>
      <PageHeader title="Overview" description="Every batch, rated against today’s date." actions={actions} />

      <div className="overview">
        <div className="overview-main">
          <section className="panel runway" aria-labelledby="runway-title">
            <h2 id="runway-title" className="runway-title">{headline}</h2>
            <p className="runway-sub">
              {summary.atRiskCount > 0 && <>{money.format(summary.atRiskValue)} of stock value is at risk. </>}
              {counts.expired > 0
                ? <>{money.number(counts.expired)} {counts.expired === 1 ? 'batch has' : 'batches have'} already expired{summary.expiredLoss > 0 ? `, a loss of ${money.format(summary.expiredLoss)}` : ''}.</>
                : 'No batches have expired.'}
            </p>

            <div className="runway-bar" role="group" aria-label="Batches by shelf-life status">
              {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
                <button key={s} className={`runway-seg seg-${s}`} style={{ flexGrow: counts[s] }}
                  onClick={() => setFilter(filter === s ? 'all' : s)}
                  aria-label={`${STATUSES[s].label}: ${counts[s]} batches. Show in register`} aria-pressed={filter === s} />
              ))}
            </div>
            <div className="runway-legend">
              {STATUS_ORDER.map((s) => (
                <button key={s} className={`legend-item${filter === s ? ' active' : ''}`} onClick={() => setFilter(filter === s ? 'all' : s)} aria-pressed={filter === s}>
                  <span className={`legend-dot seg-${s}`} aria-hidden="true" />
                  <span className="legend-text">
                    <strong>{STATUSES[s].label}</strong>
                    <small>{STATUSES[s].hint}</small>
                  </span>
                  <span className="legend-count">{money.number(counts[s])}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel kpis" aria-label="Key figures">
            <div className="kpi"><span>Stock value, in date</span><strong>{money.compact(summary.inDateValue)}</strong><small>{money.format(summary.inDateValue)}</small></div>
            <div className="kpi"><span>Units in stock</span><strong>{money.number(summary.units)}</strong><small>Excludes expired units</small></div>
            <div className="kpi"><span>Batches tracked</span><strong>{money.number(summary.total)}</strong><small>{money.number(counts.optimal)} in good shape</small></div>
            <div className="kpi"><span>Low stock</span><strong>{money.number(summary.lowStock)}</strong><small>Under {LOW_STOCK_THRESHOLD} units</small></div>
          </section>
        </div>

        <aside className="panel next-up" aria-labelledby="next-title">
          <h2 id="next-title">Next to expire</h2>
          {nextToExpire.length === 0 ? <p className="muted">No in-date batches.</p> : (
            <ol className="next-list">
              {nextToExpire.map((b) => (
                <li key={b.id}>
                  <div className="next-info">
                    <span className="cell-title">{b.medicationName}</span>
                    <span className="cell-sub">Lot {b.batchNumber} · {money.number(b.quantity)} units · {money.format(b.value)}</span>
                  </div>
                  <span className={`days-chip chip-${b.status}`}>{b.daysLeft === 0 ? 'Today' : `${b.daysLeft}d`}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      <section className="panel register" aria-labelledby="register-title">
        <div className="toolbar">
          <h2 id="register-title">Stock register</h2>
          <div className="toolbar-controls">
            <SearchBox value={query} onChange={setQuery} placeholder="Search medicine, lot or storage" label="Search the stock register" />
            <label className="select-inline">
              <span className="sr-only">Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="chips" role="group" aria-label="Filter by status">
          <button className={`chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>All <span>{money.number(summary.total)}</span></button>
          {STATUS_ORDER.map((s) => (
            <button key={s} className={`chip${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)} aria-pressed={filter === s}>
              {STATUSES[s].label} <span>{money.number(counts[s])}</span>
            </button>
          ))}
        </div>

        <DataTable key={`${filter}|${query}|${sort}`} columns={columns} rows={rows} caption="Stock register"
          empty={<EmptyState title="No batches match" message="Try a different search or clear the status filter."
            action={<button className="btn btn-secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button>} />} />
      </section>

      {dialogs}
    </>
  );
}
