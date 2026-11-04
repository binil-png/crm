import { useMemo, useState } from 'react';
import { useCrmStore } from '../../store/crmStore';
import { formatDateTime, fromLocalInput, toLocalInput } from '../../utils/constants';
import Modal from '../shared/Modal';

export default function LeaveRescheduleModal({ userEmail, date, reason, onClose }) {
  const { sessions, applyLeaveAndReschedule } = useCrmStore();
  const affected = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.Trainer_Email === userEmail &&
          isSameDay(session.Start_Time, date) &&
          session.Status !== 'Cancelled' &&
          session.Status !== 'Completed'
      ),
    [sessions, userEmail, date]
  );

  const [updates, setUpdates] = useState(() =>
    affected.map((session) => ({
      ...session,
      newStart: toLocalInput(session.Start_Time),
      newEnd: toLocalInput(session.End_Time),
    }))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const changeTime = (sessionId, key, value) => {
    setUpdates((prev) => prev.map((item) => (item.Session_ID === sessionId ? { ...item, [key]: value } : item)));
  };

  const submit = async () => {
    if (affected.length && updates.some((item) => !item.newStart || !item.newEnd)) {
      setError('Set a new start and end time for every affected session.');
      return;
    }
    if (
      affected.length &&
      updates.some(
        (item) =>
          item.newStart === toLocalInput(item.Start_Time) && item.newEnd === toLocalInput(item.End_Time)
      )
    ) {
      setError('Pick new times for every affected session before applying leave.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await applyLeaveAndReschedule({
        userEmail,
        date,
        reason,
        updates: updates.map((item) => ({
          ...item,
          newStart: fromLocalInput(item.newStart),
          newEnd: fromLocalInput(item.newEnd),
        })),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Leave and reschedule" onClose={onClose} wide>
      <p className="text-sm text-slate-600">
        Leave on {date} for {userEmail}. Affected training sessions must be moved on Google Calendar before the leave is saved.
      </p>
      {error ? <p className="mt-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}

      {updates.length === 0 ? (
        <p className="mt-4 text-sm">No scheduled sessions on this date. Leave can be logged directly.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {updates.map((session) => (
            <div key={session.Session_ID} className="rounded border border-slate-200 p-3">
              <p className="font-medium">{session.Session_Title}</p>
              <p className="text-xs text-slate-500">
                Current: {formatDateTime(session.Start_Time)} – {formatDateTime(session.End_Time)}
              </p>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  New start
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    value={session.newStart}
                    onChange={(e) => changeTime(session.Session_ID, 'newStart', e.target.value)}
                    required
                  />
                </label>
                <label className="text-sm">
                  New end
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    value={session.newEnd}
                    onChange={(e) => changeTime(session.Session_ID, 'newEnd', e.target.value)}
                    required
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={submit} disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white">
          {busy ? 'Updating calendar…' : updates.length ? 'Reschedule and log leave' : 'Log leave'}
        </button>
        <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function isSameDay(iso, dateStr) {
  if (!iso || !dateStr) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso).startsWith(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` === dateStr;
}
