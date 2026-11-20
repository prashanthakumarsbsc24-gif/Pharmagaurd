import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { downloadCSV } from '../utils/csv';
import { formatDateTime } from '../utils/dates';

export default function AuditPage() {
  const { region } = useAuth();
  const [log, setLog] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.audit().then((rows) => { if (!cancelled) setLog(rows); }).catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async () => {
    try { setLog(await api.audit()); setError(''); } catch (e) { setError(e.message); }
  }, []);

  const columns = [
    { id: 'time', header: 'When', cell: (r) => <span className="nowrap">{formatDateTime(r.timestamp, region.locale)}</span> },
    { id: 'user', header: 'Operator', cell: (r) => r.user },
    { id: 'action', header: 'Event', cell: (r) => <span className="badge badge-info">{r.action}</span> },
    { id: 'details', header: 'Details', cell: (r) => <span className="details">{r.details}</span> },
  ];

  const actions = (
    <>
      <button className="btn btn-secondary" onClick={refresh}><RefreshCw size={16} />Refresh</button>
      <button className="btn btn-secondary" disabled={!log?.length}
        onClick={() => downloadCSV('pharmaguard-audit-trail.csv', ['Timestamp', 'Operator', 'Event', 'Details'], log.map((r) => [new Date(r.timestamp).toISOString(), r.user, r.action, r.details]))}>
        <Download size={16} />Download CSV
      </button>
    </>
  );

  return (
    <>
      <PageHeader title="Audit trail" description="Every sign-in, stock change, import and disposal. Entries are written by the server and cannot be edited or deleted." actions={actions} />
      <section className="panel register">
        {error ? <ErrorState message={error} /> : !log ? <LoadingState /> : (
          <DataTable columns={columns} rows={log} pageSize={20} caption="Audit trail" empty={<EmptyState title="No events yet" />} />
        )}
      </section>
    </>
  );
}
