import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { enrich, summarize } from '../utils/inventory';
import { todayUTC } from '../utils/dates';

const InventoryContext = createContext(null);

const byExpiry = (a, b) => a.expirationDate.localeCompare(b.expirationDate) || a.medicationName.localeCompare(b.medicationName);

export function InventoryProvider({ children }) {
  const [batches, setBatches] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [today] = useState(todayUTC);

  useEffect(() => {
    let cancelled = false;
    api.batches.list()
      .then((rows) => { if (!cancelled) { setBatches(rows); setStatus('ready'); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setStatus('error'); } });
    return () => { cancelled = true; };
  }, []);

  const reload = useCallback(async () => {
    const rows = await api.batches.list();
    setBatches(rows);
  }, []);

  const addBatch = useCallback(async (data) => {
    const created = await api.batches.create(data);
    setBatches((prev) => [...prev, created].sort(byExpiry));
    return created;
  }, []);

  const updateBatch = useCallback(async (id, data) => {
    const updated = await api.batches.update(id, data);
    setBatches((prev) => prev.map((b) => (b.id === id ? updated : b)).sort(byExpiry));
    return updated;
  }, []);

  const removeBatch = useCallback(async (id, reason) => {
    await api.batches.remove(id, reason);
    setBatches((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const importBatches = useCallback(async (rows, filename) => {
    const result = await api.batches.import(rows, filename);
    await reload();
    return result;
  }, [reload]);

  const items = useMemo(() => batches.map((b) => enrich(b, today)), [batches, today]);
  const summary = useMemo(() => summarize(items), [items]);

  const value = useMemo(
    () => ({ items, summary, status, error, reload, addBatch, updateBatch, removeBatch, importBatches }),
    [items, summary, status, error, reload, addBatch, updateBatch, removeBatch, importBatches]
  );
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export const useInventory = () => useContext(InventoryContext);
