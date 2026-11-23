import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { INTERACTION_CHANNELS, appendStageComment, formatDateTime, parseStageComments } from '../../utils/constants';

export default function CommunicationPanel() {
  const { user, privileges } = useAuth();
  const { leads, messages, addMessage, updateLead } = useCrmStore();
  const [leadKey, setLeadKey] = useState('');
  const [staff, setStaff] = useState('All');
  const [channel, setChannel] = useState('Comment');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selected = leads.find((lead) => `${lead._sheet}#${lead['Sl No']}` === leadKey);

  const history = useMemo(() => {
    const fromSheet = messages.map((item) => ({ ...item, _kind: 'sheet' }));
    const fromLeads = leads.flatMap((lead) =>
      parseStageComments(lead.Comments).map((item, index) => ({
        Timestamp: lead.Date || '',
        'Sheet Name': lead._sheet,
        'Client Name': lead['Customer Name'],
        Executive: lead.Executive || '',
        Channel: 'Lead comment',
        Notes: item.message || item.raw,
        _kind: 'lead-comment',
        _key: `${lead._sheet}#${lead['Sl No']}-c-${item.num || index}`,
      }))
    );
    const rows = [...fromSheet, ...fromLeads];
    const clientName = selected?.['Customer Name'];
    return rows
      .filter((item) => !clientName || item['Client Name'] === clientName)
      .filter((item) => staff === 'All' || String(item.Executive || '').trim() === staff)
      .sort((a, b) => String(b.Timestamp).localeCompare(String(a.Timestamp)));
  }, [messages, leads, selected, staff]);

  const staffNames = useMemo(
    () =>
      [
        ...new Set(
          [...messages, ...leads].map((item) => String(item.Executive || '').trim()).filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [messages, leads]
  );

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
        Executive: user?.name || user?.email || selected.Executive || '',
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
        {privileges.canViewAllInteractions
          ? 'All staff records: Interaction History posts plus comments, scheduled calls and status notes from every lead.'
          : 'Posts to Interaction History and appends a stage note on the lead Comments column.'}
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Customer
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={leadKey}
            onChange={(e) => setLeadKey(e.target.value)}
          >
            <option value="">All customers</option>
            {leads.map((lead) => (
              <option key={`${lead._sheet}#${lead['Sl No']}`} value={`${lead._sheet}#${lead['Sl No']}`}>
                {lead['Customer Name']} · {lead._sheet}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Logged by
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
          >
            <option value="All">All staff</option>
            {staffNames.map((name) => (
              <option key={name} value={name}>
                {name}
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
        {history.length === 0 ? <p className="text-sm text-slate-500">No interactions yet.</p> : null}
        {history.map((item, index) => (
          <article key={item._key || `${item.Timestamp}-${item.Notes}-${index}`} className="rounded border border-slate-100 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {item.Channel} · {item.Executive || 'Staff'} · {item['Sheet Name']} · {item['Client Name']}
              </span>
              <span>{item.Timestamp ? formatDateTime(item.Timestamp) : ''}</span>
            </div>
            <p className="mt-1 text-sm">{item.Notes}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
