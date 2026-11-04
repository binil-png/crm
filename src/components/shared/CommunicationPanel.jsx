import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { INTERACTION_CHANNELS, appendStageComment, formatDateTime } from '../../utils/constants';

export default function CommunicationPanel() {
  const { user } = useAuth();
  const { leads, messages, addMessage, updateLead } = useCrmStore();
  const [leadKey, setLeadKey] = useState('');
  const [channel, setChannel] = useState('Comment');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selected = leads.find((lead) => `${lead._sheet}#${lead['Sl No']}` === leadKey);

  const thread = useMemo(() => {
    const rows = selected
      ? messages.filter((item) => item['Client Name'] === selected['Customer Name'])
      : messages;
    return [...rows].sort((a, b) => String(b.Timestamp).localeCompare(String(a.Timestamp)));
  }, [messages, selected]);

  const submit = async (event) => {
    event.preventDefault();
    if (!selected || !notes.trim()) {
      setError('Select a customer and enter notes.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await addMessage({
        'Sheet Name': selected._sheet,
        'Client Name': selected['Customer Name'],
        Executive: selected.Executive || user?.name || '',
        Channel: channel,
        Notes: notes.trim(),
        'Scheduled Date': selected['Scheduled Date'] || '',
      });
      await updateLead(selected, {
        Comments: appendStageComment(selected.Comments, `${channel}: ${notes.trim()}`),
      });
      setNotes('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Interaction History</h2>
      <p className="text-sm text-slate-500">
        Posts to the Interaction History sheet and appends a stage note on the lead Comments column.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Customer
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={leadKey}
            onChange={(e) => setLeadKey(e.target.value)}
          >
            <option value="">All / select customer</option>
            {leads.map((lead) => (
              <option key={`${lead._sheet}#${lead['Sl No']}`} value={`${lead._sheet}#${lead['Sl No']}`}>
                {lead['Customer Name']} · {lead._sheet}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Channel
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            {INTERACTION_CHANNELS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2 text-sm">
          Notes
          <textarea
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {error ? <p className="md:col-span-2 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        <button type="submit" disabled={busy} className="w-fit rounded bg-slate-900 px-4 py-2 text-sm text-white">
          {busy ? 'Posting…' : 'Log interaction'}
        </button>
      </form>

      <div className="mt-5 space-y-3">
        {thread.length === 0 ? <p className="text-sm text-slate-500">No interactions yet.</p> : null}
        {thread.map((item, index) => (
          <article key={`${item.Timestamp}-${index}`} className="rounded border border-slate-100 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {item.Channel} · {item.Executive} · {item['Sheet Name']} · {item['Client Name']}
              </span>
              <span>{formatDateTime(item.Timestamp)}</span>
            </div>
            <p className="mt-1 text-sm">{item.Notes}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
