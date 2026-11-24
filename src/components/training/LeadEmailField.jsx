import { useEffect, useState } from 'react';
import { useCrmStore } from '../../store/crmStore';
import { clientLeadEmail, isValidLeadEmail } from '../../utils/constants';

export default function LeadEmailField({ client, compact = false }) {
  const { leads, setClientLeadEmail } = useCrmStore();
  const current = clientLeadEmail(client, leads);
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(current);
    setError('');
    setSaved(false);
  }, [client?.Client_ID, current]);

  const save = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!client?.Client_ID) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await setClientLeadEmail(client.Client_ID, value);
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save this email ID.');
    } finally {
      setBusy(false);
    }
  };

  const stopDrag = (event) => event.stopPropagation();
  const missing = !isValidLeadEmail(current);
  const unchanged = String(value || '').trim().toLowerCase() === current;

  return (
    <form
      onSubmit={save}
      onClick={stopDrag}
      onMouseDown={stopDrag}
      className={compact ? 'rounded-md border border-slate-200 bg-white p-2' : 'mt-3'}
    >
      <label className={`block ${compact ? 'text-[11px] text-slate-600' : 'text-sm'}`}>
        Lead email ID
        <input
          type="email"
          autoComplete="off"
          placeholder="name@clinic.com"
          className={`mt-1 w-full rounded border px-2 py-1.5 ${compact ? 'text-xs' : 'text-sm'} ${
            missing ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-white'
          }`}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
            setError('');
          }}
        />
      </label>
      {missing ? (
        <p className={`mt-1 ${compact ? 'text-[11px]' : 'text-xs'} text-slate-500`}>
          Optional. You can schedule now and add an email later for calendar invites.
        </p>
      ) : null}
      {error ? <p className={`mt-1 ${compact ? 'text-[11px]' : 'text-xs'} text-rose-700`}>{error}</p> : null}
      {saved ? <p className={`mt-1 ${compact ? 'text-[11px]' : 'text-xs'} text-emerald-700`}>Email saved.</p> : null}
      <button
        type="submit"
        disabled={busy || unchanged || !String(value || '').trim()}
        className={`mt-2 rounded bg-sky-700 text-white disabled:opacity-50 ${
          compact ? 'w-full px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-sm'
        }`}
      >
        {busy ? 'Saving…' : current ? 'Save email' : 'Add email'}
      </button>
    </form>
  );
}
