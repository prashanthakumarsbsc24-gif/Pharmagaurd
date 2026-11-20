import PageHeader from '../components/PageHeader';
import { StatusDoughnut, ValueBars, DemandBars } from '../components/Charts';
import { EmptyState, LoadingState } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';

export default function AnalyticsPage() {
  const { items, summary, status } = useInventory();
  const { money } = useAuth();
  const top = [...items].sort((a, b) => b.unitsSold - a.unitsSold).filter((i) => i.unitsSold > 0).slice(0, 5);

  if (status === 'loading') return <LoadingState />;

  return (
    <>
      <PageHeader title="Analytics" description="How your stock is spread across shelf-life risk, and what it is worth." />
      {summary.total === 0 ? (
        <div className="panel"><EmptyState title="Nothing to chart yet" message="Add or import batches and the charts will fill in." /></div>
      ) : (
        <div className="charts">
          <section className="panel">
            <h2>Batches by shelf-life status</h2>
            <div className="chart-box"><StatusDoughnut counts={summary.counts} money={money} /></div>
          </section>
          <section className="panel">
            <h2>Stock value by status ({money.currency})</h2>
            <div className="chart-box"><ValueBars values={summary.values} money={money} /></div>
          </section>
          <section className="panel span-all">
            <h2>Top 5 medicines by units sold</h2>
            {top.length === 0
              ? <p className="muted">No sales recorded yet. Add units sold to a batch or import a CSV with a units_sold column.</p>
              : <div className="chart-box chart-short"><DemandBars items={top} money={money} /></div>}
          </section>
        </div>
      )}
    </>
  );
}
