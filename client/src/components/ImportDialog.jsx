import { useMemo, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { downloadCSV, normaliseRecord, parseCSV } from '../utils/csv';
import { formatDate } from '../utils/dates';

const MAX_ROWS = 20000;

export default function ImportDialog({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Import from CSV" size="lg"
      description="Add many batches at once. Rows that already exist are skipped, so importing the same file twice is safe.">
      <ImportFlow onClose={onClose} />
    </Modal>
  );
}

function ImportFlow({ onClose }) {
  const { region, money } = useAuth();
  const { importBatches } = useInventory();
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const review = useMemo(() => {
    if (!text) return null;
    const { records } = parseCSV(text);
    const rows = [];
    const problems = new Map();
    records.forEach((rec) => {
      const out = normaliseRecord(rec, region.code);
      if (out.row) rows.push(out.row);
      else problems.set(out.error, (problems.get(out.error) || 0) + 1);
    });
    return { total: records.length, rows, problems: [...problems.entries()] };
  }, [text, region.code]);

  const load = async (f) => {
    if (!f) return;
    setError(''); setResult(null);
    setFile(f);
    setText(await f.text());
  };

  const run = async () => {
    setBusy(true); setError('');
    try {
      setResult(await importBatches(review.rows, file.name));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () =>
    downloadCSV('pharmaguard-template.csv',
      ['name', 'batch', 'price', 'stock', 'date', 'storage', 'units_sold'],
      [['Dolo 650 mg | Paracetamol | 15 Tabs', 'DL2406A', '30.91', '1200', '2027-06-30', 'Room temp (15–25°C)', '940']]);

  if (result) {
    return (
      <div className="import-result">
        <h3>Import finished</h3>
        <dl className="result-list">
          <div><dt>Added</dt><dd>{money.number(result.inserted)}</dd></div>
          <div><dt>Already in your stock</dt><dd>{money.number(result.skippedExisting + result.skippedDuplicateInFile)}</dd></div>
          <div><dt>Could not be read</dt><dd>{money.number(result.invalidCount)}</dd></div>
        </dl>
        <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
      </div>
    );
  }

  const tooMany = review && review.rows.length > MAX_ROWS;

  return (
    <div className="import-flow">
      <label className={`dropzone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); load(e.dataTransfer.files[0]); }}>
        <input type="file" accept=".csv,text/csv" onChange={(e) => load(e.target.files[0])} />
        {file ? <FileSpreadsheet size={26} aria-hidden="true" /> : <Upload size={26} aria-hidden="true" />}
        <strong>{file ? file.name : 'Choose a CSV file or drop it here'}</strong>
        <span>{file ? 'Choose a different file to replace it' : 'Comma, semicolon or tab separated'}</span>
      </label>

      <p className="hint">
        Needs a medication name and an expiry date. Optional columns: batch, price, stock, storage, units_sold.
        Prices are saved as <strong>{money.currency}</strong> exactly as written; nothing is converted.
        {' '}<button type="button" className="link-btn" onClick={downloadTemplate}>Download a template</button>
      </p>

      {review && (
        <div className="review">
          <p className="review-summary">
            <strong>{money.number(review.rows.length)}</strong> of {money.number(review.total)} rows are ready to import.
          </p>
          {review.problems.length > 0 && (
            <ul className="problem-list">
              {review.problems.slice(0, 4).map(([msg, n]) => <li key={msg}>{n} × {msg}</li>)}
            </ul>
          )}
          {review.rows.length > 0 && (
            <div className="table-wrap preview">
              <table className="table table-compact">
                <thead><tr><th>Medication</th><th>Lot</th><th className="num">Price</th><th className="num">Stock</th><th>Expiry</th></tr></thead>
                <tbody>
                  {review.rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td>{r.medicationName}</td>
                      <td><code className="lot">{r.batchNumber}</code></td>
                      <td className="num">{money.format(r.price)}</td>
                      <td className="num">{money.number(r.quantity)}</td>
                      <td>{formatDate(r.expirationDate, region.locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tooMany && <p className="form-error" role="alert">Import at most {money.number(MAX_ROWS)} rows at a time. Split the file and import it in parts.</p>}
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={run} disabled={busy || !review || review.rows.length === 0 || tooMany}>
          {busy ? 'Importing…' : review?.rows.length ? `Import ${money.number(review.rows.length)} batches` : 'Import'}
        </button>
      </div>
    </div>
  );
}
