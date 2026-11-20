import { Bar, Doughnut } from 'react-chartjs-2';
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip,
} from 'chart.js';
import { STATUS_ORDER, STATUSES } from '../utils/inventory';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
ChartJS.defaults.font.family = "'IBM Plex Sans', system-ui, sans-serif";
ChartJS.defaults.font.size = 13;
ChartJS.defaults.color = '#566863';

const FILL = { expired: '#c9372c', critical: '#e0701a', warning: '#e5b020', optimal: '#2f9e69' };
const labels = STATUS_ORDER.map((s) => STATUSES[s].label);
const colors = STATUS_ORDER.map((s) => FILL[s]);

export function StatusDoughnut({ counts, money }) {
  return (
    <Doughnut
      data={{ labels, datasets: [{ data: STATUS_ORDER.map((s) => counts[s]), backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] }}
      options={{
        maintainAspectRatio: false, cutout: '64%',
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${money.number(c.parsed)} batches` } },
        },
      }}
    />
  );
}

export function ValueBars({ values, money }) {
  return (
    <Bar
      data={{ labels, datasets: [{ data: STATUS_ORDER.map((s) => values[s]), backgroundColor: colors, borderRadius: 6, maxBarThickness: 56 }] }}
      options={{
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${money.format(c.parsed.y)}` } } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e7eeea' }, border: { display: false }, ticks: { callback: (v) => money.compact(v) } },
          x: { grid: { display: false } },
        },
      }}
    />
  );
}

export function DemandBars({ items, money }) {
  return (
    <Bar
      data={{
        labels: items.map((i) => (i.medicationName.length > 28 ? `${i.medicationName.slice(0, 27)}…` : i.medicationName)),
        datasets: [{ label: 'Units sold', data: items.map((i) => i.unitsSold), backgroundColor: '#0b6b5c', borderRadius: 6, maxBarThickness: 28 }],
      }}
      options={{
        indexAxis: 'y', maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${money.number(c.parsed.x)} units sold` } },
        },
        scales: { x: { beginAtZero: true, grid: { color: '#e7eeea' }, border: { display: false } }, y: { grid: { display: false } } },
      }}
    />
  );
}
