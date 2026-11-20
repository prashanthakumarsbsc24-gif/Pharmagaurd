import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import BatchDialog from '../components/BatchDialog';
import { EmptyState, LoadingState } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/dates';
import { LOW_STOCK_THRESHOLD } from '../utils/inventory';
import StatusBadge from '../components/StatusBadge';

export default function LowStockPage() {
  const { items, status, updateBatch } = useInventory();
  const { region, money } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(undefined);

  const rows = useMemo(
    () => items.filter((i) => i.status !== 'expired' && i.quantity < LOW_STOCK_THRESHOLD).sort((a, b) => a.quantity - b.quantity || a.daysLeft - b.daysLeft),
    [items]
  );

  const columns = [
    { id: 'name', header: 'Medication', cell: (r) => <span className="cell-title">{r.medicationName}</span> },
    { id: 'lot', header: 'Lot', cell: (r) => <code className="lot">{r.batchNumber}</code> },
    { id: 'price', header: 'Price', align: 'right', cell: (r) => money.format(r.price) },
    { id: 'qty', header: 'In stock', align: 'right', cell: (r) => <strong className="stock-low">{money.number(r.quantity)}</strong> },
    { id: 'exp', header: 'Expires', cell: (r) => formatDate(r.expirationDate, region.locale) },
    { id: 'st', header: 'Status', cell: (r) => r.quantity === 0 ? <span className="badge badge-expired"><span className="badge-dot" />Out of stock</span> : <StatusBadge status={r.status} /> },
    { id: 'act', header: <span className="sr-only">Action</span>, align: 'right', cell: (r) => <button className="btn btn-secondary btn-sm" onClick={() => setEditing(r)}><Pencil size={14} />Update stock</button> },
  ];

  if (status === 'loading') return <LoadingState />;

  return (
    <>
      <PageHeader title="Low stock" description={`In-date batches with fewer than ${LOW_STOCK_THRESHOLD} units left. Expired batches are not listed.`} />
      <section className="panel register">
        <DataTable columns={columns} rows={rows} caption="Low stock batches" empty={<EmptyState title="Stock levels look healthy" message={`No in-date batch is under ${LOW_STOCK_THRESHOLD} units.`} />} />
      </section>
      <BatchDialog open={editing !== undefined} batch={editing ?? null} onClose={() => setEditing(undefined)}
        onSave={async (data) => { await updateBatch(editing.id, data); toast.success(`${data.medicationName} updated.`); }} />
    </>
  );
}
