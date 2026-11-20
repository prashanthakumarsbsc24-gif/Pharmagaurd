import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { makeMoney } from '../utils/currency';
import ConfirmDialog from './ConfirmDialog';

export default function RegionSwitcher() {
  const { options, region, money, setRegion } = useAuth();
  const toast = useToast();
  const [request, setRequest] = useState(null);

  const choose = (code) => {
    const next = options.regions.find((r) => r.code === code);
    if (!next || next.code === region.code) return;
    const nextMoney = makeMoney(next);
    setRequest({
      title: `Switch to ${next.name} (${next.currency})?`,
      body: `Amounts will show as ${nextMoney.format(1234567.5)}. Prices already stored are not converted: a price saved as 100 will read ${nextMoney.format(100)}. Update your prices if they were entered in another currency.`,
      confirmLabel: `Switch to ${next.currency}`,
      onConfirm: async () => {
        try {
          await setRegion(next.code);
          toast.success(`Region set to ${next.name}. Amounts now show in ${next.currency}.`);
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  };

  return (
    <>
      <label className="region-switch">
        <Globe size={16} aria-hidden="true" />
        <span className="sr-only">Region and currency</span>
        <span className="region-symbol" aria-hidden="true">{money.symbol}</span>
        <select value={region.code} onChange={(e) => choose(e.target.value)}>
          {options.regions.map((r) => (
            <option key={r.code} value={r.code}>{r.name} · {r.currency}</option>
          ))}
        </select>
      </label>
      <ConfirmDialog request={request} onClose={() => setRequest(null)} />
    </>
  );
}
