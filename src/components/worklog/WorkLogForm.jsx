import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { ENTRY_TYPES, todayInput } from '../../utils/constants';
import LeaveRescheduleModal from './LeaveRescheduleModal';

export default function WorkLogForm() {
  const { user } = useAuth();
  const { worklogs, addWorklog } = useCrmStore();
  const [entryType, setEntryType] = useState(ENTRY_TYPES.WORK);
  const [date, setDate] = useState(todayInput());
  const [summary, setSummary] = useState('');
  const [reason, setReason] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const mine = worklogs.filter((log) => log.User_Email === user?.email);

  const submit = async (event) => {
    event.preventDefault();
    if (entryType === ENTRY_TYPES.LEAVE) {
      if (!reason.trim()) {
        setError('Leave reason is required.');
        return;
      }
      setLeaveOpen(true);
      return;
    }
    if (!summary.trim()) {
      setError('Work summary is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await addWorklog({
        User_Email: user?.email,
        Date: date,
        Entry_Type: ENTRY_TYPES.WORK,
        Work_Summary: summary.trim(),
      });
      setSummary('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Daily work log & leave</h2>
        {error ? <p className="mt-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}

        <label className="mt-4 block text-sm">
          Date
          <input
            type="date"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <label className="mt-3 block text-sm">
          Entry type
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={entryType}
            onChange={(e) => setEntryType(e.target.value)}
          >
            <option value={ENTRY_TYPES.WORK}>Work Log</option>
            <option value={ENTRY_TYPES.LEAVE}>Leave</option>
          </select>
        </label>

        {entryType === ENTRY_TYPES.WORK ? (
          <label className="mt-3 block text-sm">
            Work summary
            <textarea
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
        ) : (
          <label className="mt-3 block text-sm">
            Leave reason
            <textarea
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}

        <button type="submit" disabled={busy} className="mt-4 rounded bg-slate-900 px-4 py-2 text-white">
          {entryType === ENTRY_TYPES.LEAVE ? 'Check sessions and apply leave' : busy ? 'Saving…' : 'Save work log'}
        </button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-medium">Your recent entries</h3>
        <div className="mt-3 space-y-3">
          {mine.length === 0 ? <p className="text-sm text-slate-500">No logs yet.</p> : null}
          {mine.slice(0, 8).map((log) => (
            <article key={log.Log_ID} className="rounded border border-slate-100 p-3 text-sm">
              <p className="text-xs text-slate-500">
                {log.Date} · {log.Entry_Type}
              </p>
              <p className="mt-1">{log.Entry_Type === ENTRY_TYPES.LEAVE ? log.Leave_Reason : log.Work_Summary}</p>
              {log.Rescheduled_Sessions ? (
                <p className="mt-1 text-xs text-amber-700">
                  Rescheduled: {formatRescheduled(log.Rescheduled_Sessions)}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      {leaveOpen ? (
        <LeaveRescheduleModal
          userEmail={user?.email}
          date={date}
          reason={reason}
          onClose={() => setLeaveOpen(false)}
        />
      ) : null}
    </section>
  );
}

function formatRescheduled(value) {
  try {
    const items = JSON.parse(value);
    if (!Array.isArray(items)) return value;
    return items
      .map((item) => `${item.Session_Title || item.Session_ID} → ${new Date(item.New_Start).toLocaleString()}`)
      .join('; ');
  } catch {
    return value;
  }
}
