import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import SearchBox from '../components/SearchBox';
import { EmptyState, LoadingState } from '../components/States';
import { useMoney } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { BOOST_ABOVE_UNITS_SOLD } from '../utils/inventory';

export default function DemandPage() {
  const { items, summary, status } = useInventory();
  const money = useMoney();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.status !== 'expired')
      .filter((i) => !q || `${i.medicationName} ${i.batchNumber}`.toLowerCase().includes(q))
      .sort((a, b) => b.unitsSold - a.unitsSold);
  }, [items, query]);
  const boosted = items.filter((i) => i.status !== 'expired' && i.unitsSold > BOOST_ABOVE_UNITS_SOLD).length;

  const columns = [
    { id: 'name', header: 'Medication', cell: (r) => <span className="cell-title">{r.medicationName}</span> },
    { id: 'lot', header: 'Lot', cell: (r) => <code className="lot">{r.batchNumber}</code> },
    { id: 'sold', header: 'Units sold', align: 'right', cell: (r) => <strong>{money.number(r.unitsSold)}</strong> },
    { id: 'stock', header: 'In stock', align: 'right', cell: (r) => money.number(r.quantity) },
    { id: 'rev', header: 'Revenue', align: 'right', cell: (r) => money.format(r.revenue) },
    { id: 'rec', header: 'Production', cell: (r) => r.unitsSold > BOOST_ABOVE_UNITS_SOLD
      ? <span className="badge badge-info">Increase by 50%</span>
      : <span className="badge badge-optimal"><span className="badge-dot" aria-hidden="true" />Maintain</span> },
  ];

  if (status === 'loading') return <LoadingState />;

  return (
    <>
      <PageHeader title="Demand & production" description={`Batches that sold more than ${BOOST_ABOVE_UNITS_SOLD} units are flagged for a 50% production increase.`} />
      <section className="panel kpis kpis-3" aria-label="Demand totals">
        <div className="kpi"><span>Revenue recorded</span><strong>{money.compact(summary.revenue)}</strong><small>{money.format(summary.revenue)}</small></div>
        <div className="kpi"><span>Units sold</span><strong>{money.number(summary.unitsSold)}</strong><small>All batches</small></div>
        <div className="kpi"><span>Flagged to scale up</span><strong>{money.number(boosted)}</strong><small>In-date batches</small></div>
      </section>
      <section className="panel register">
        <div className="toolbar">
          <h2>Production recommendations</h2>
          <SearchBox value={query} onChange={setQuery} placeholder="Search medicine or lot" label="Search demand" />
        </div>
        <DataTable key={query} columns={columns} rows={rows} caption="Demand by batch" empty={<EmptyState title="No in-date batches" />} />
      </section>
    </>
  );
}
