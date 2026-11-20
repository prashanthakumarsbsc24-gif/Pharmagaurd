import { useState } from 'react';
import Modal from './Modal';

// `request` is null when closed, or { title, body, confirmLabel, tone, onConfirm }.
export default function ConfirmDialog({ request, onClose }) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await request.onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <Modal
      open={Boolean(request)}
      onClose={onClose}
      title={request?.title ?? ''}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className={`btn ${request?.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={busy}>
            {busy ? 'Working…' : request?.confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm-body">{request?.body}</p>
    </Modal>
  );
}
