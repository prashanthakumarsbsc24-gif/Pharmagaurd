import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// columns: [{ id, header, cell: (row) => node, align?: 'right' }]
// Give the table a `key` that changes with its filters to jump back to page 1.
export default function DataTable({ columns, rows, rowKey = (r) => r.id, pageSize = 15, caption, empty }) {
  const { money } = useAuth();
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);

  if (rows.length === 0) return empty ?? null;

  return (
    <div className="table-block">
      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.id} scope="col" className={c.align === 'right' ? 'num' : undefined}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.id} className={c.align === 'right' ? 'num' : undefined}>{c.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <nav className="pager" aria-label="Pagination">
          <span>
            Showing {money.number(start + 1)}–{money.number(Math.min(start + pageSize, rows.length))} of {money.number(rows.length)}
          </span>
          <div className="pager-controls">
            <button className="icon-btn" onClick={() => setPage(current - 1)} disabled={current === 1} aria-label="Previous page">
              <ChevronLeft size={18} />
            </button>
            <span className="pager-page">Page {current} of {pages}</span>
            <button className="icon-btn" onClick={() => setPage(current + 1)} disabled={current === pages} aria-label="Next page">
              <ChevronRight size={18} />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
