import { useState } from 'react';
import Modal from './Modal';
import { useMoney } from '../context/AuthContext';

const STORAGE_PRESETS = ['Room temp (15–25°C)', 'Cool & dry (below 25°C)', 'Refrigerated (2–8°C)', 'Frozen (−20°C)'];

// `batch` is null for a new record, or the record being edited.
export default function BatchDialog({ open, batch, onClose, onSave }) {
  return (
    <Modal open={open} onClose={onClose} title={batch ? 'Edit batch' : 'Add batch'}
      description={batch ? `${batch.medicationName}, lot ${batch.batchNumber}` : 'Record a medicine batch and when it expires.'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="batch-form" className="btn btn-primary">{batch ? 'Save changes' : 'Add batch'}</button>
        </>
      }
    >
      <BatchForm batch={batch} onSave={onSave} onDone={onClose} />
    </Modal>
  );
}

function BatchForm({ batch, onSave, onDone }) {
  const money = useMoney();
  const [form, setForm] = useState({
    medicationName: batch?.medicationName ?? '',
    batchNumber: batch?.batchNumber === 'N/A' ? '' : batch?.batchNumber ?? '',
    storage: batch?.storage ?? STORAGE_PRESETS[0],
    price: batch?.price ?? '',
    quantity: batch?.quantity ?? '',
    unitsSold: batch?.unitsSold ?? 0,
    expirationDate: batch?.expirationDate ?? '',
  });
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onSave({
        ...form,
        price: form.price === '' ? 0 : Number(form.price),
        quantity: Number(form.quantity),
        unitsSold: Number(form.unitsSold || 0),
      });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form id="batch-form" className="form-grid" onSubmit={submit}>
      <div className="field span-2">
        <label htmlFor="bf-name">Medication</label>
        <input id="bf-name" value={form.medicationName} onChange={set('medicationName')} required maxLength={160} placeholder="e.g. Dolo 650 mg | Paracetamol | 15 Tabs" autoFocus />
      </div>
      <div className="field">
        <label htmlFor="bf-lot">Lot / batch number</label>
        <input id="bf-lot" value={form.batchNumber} onChange={set('batchNumber')} maxLength={60} placeholder="Leave empty if unknown" />
      </div>
      <div className="field">
        <label htmlFor="bf-exp">Expiry date</label>
        <input id="bf-exp" type="date" value={form.expirationDate} onChange={set('expirationDate')} required />
      </div>
      <div className="field">
        <label htmlFor="bf-price">Price per unit</label>
        <div className="input-affix">
          <span aria-hidden="true">{money.symbol}</span>
          <input id="bf-price" type="number" min="0" step="any" value={form.price} onChange={set('price')} placeholder="0" inputMode="decimal" />
        </div>
        <small>In {money.currency}</small>
      </div>
      <div className="field">
        <label htmlFor="bf-qty">Units in stock</label>
        <input id="bf-qty" type="number" min="0" step="1" value={form.quantity} onChange={set('quantity')} required inputMode="numeric" />
      </div>
      <div className="field">
        <label htmlFor="bf-sold">Units sold</label>
        <input id="bf-sold" type="number" min="0" step="1" value={form.unitsSold} onChange={set('unitsSold')} inputMode="numeric" />
      </div>
      <div className="field">
        <label htmlFor="bf-storage">Storage</label>
        <input id="bf-storage" list="storage-presets" value={form.storage} onChange={set('storage')} maxLength={80} />
        <datalist id="storage-presets">{STORAGE_PRESETS.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
      {error && <p className="form-error span-2" role="alert">{error}</p>}
    </form>
  );
}
