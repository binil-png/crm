import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useCrmStore } from '../../store/crmStore';
import { clientLeadEmail, isValidLeadEmail } from '../../utils/constants';
import Modal from '../shared/Modal';

export default function LeadEmailField({ client, compact = false }) {
  const { leads, setClientLeadEmail } = useCrmStore();
  const current = clientLeadEmail(client, leads);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(current);
    setError('');
  }, [client?.Client_ID, current]);

  const stopBubble = (event) => {
    event.stopPropagation();
  };

  const openPopup = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setValue(current);
    setError('');
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!client?.Client_ID) return;
    setBusy(true);
    setError('');
    try {
      await setClientLeadEmail(client.Client_ID, value);
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Could not save this email ID.');
    } finally {
      setBusy(false);
    }
  };

  const missing = !isValidLeadEmail(current);
  const unchanged = String(value || '').trim().toLowerCase() === current;
  const label = current ? 'Edit email' : 'Add email';

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={openPopup}
        onPointerDown={stopBubble}
        onMouseDown={stopBubble}
        className={`inline-flex shrink-0 items-center justify-center rounded text-slate-500 hover:bg-white hover:text-sky-800 ${
          compact ? 'h-6 w-6' : 'h-7 w-7'
        } ${missing ? 'text-amber-700 hover:text-amber-800' : ''}`}
      >
        <Pencil size={compact ? 13 : 15} />
      </button>
      {open ? (
        <Modal title={`${label} · ${client?.Client_Name || 'Client'}`} onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-3">
            <label className="block text-sm">
              Email
              <input
                type="email"
                autoComplete="off"
                autoFocus
                placeholder="name@clinic.com"
                className={`mt-1 w-full rounded border px-3 py-2 text-sm ${
                  missing && !value ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-white'
                }`}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError('');
                }}
              />
            </label>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || unchanged || !String(value || '').trim()}
                className="rounded bg-sky-700 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy ? 'Saving…' : current ? 'Save email' : 'Add email'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
