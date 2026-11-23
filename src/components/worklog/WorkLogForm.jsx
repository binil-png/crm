import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import {
  ENTRY_TYPES,
  leaveStatusColor,
  leaveStatusOf,
  sameEmail,
  todayInput,
} from '../../utils/constants';
import LeaveRescheduleModal from './LeaveRescheduleModal';
import { sendLeaveDecisionEmail } from '../../services/mailService';

export default function WorkLogForm() {
  const { user, privileges } = useAuth();
  const { worklogs, addWorklog, updateWorklog } = useCrmStore();
  const [entryType, setEntryType] = useState(ENTRY_TYPES.WORK);
  const [date, setDate] = useState(todayInput());
  const [summary, setSummary] = useState('');
  const [reason, setReason] = useState('');
  const [staff, setStaff] = useState('All');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const visibleLogs = useMemo(() => {
    const rows = privileges.canViewAllWorklogs
      ? worklogs
      : worklogs.filter((log) => sameEmail(log.User_Email, user?.email));
    return staff === 'All' ? rows : rows.filter((log) => sameEmail(log.User_Email, staff));
  }, [worklogs, privileges.canViewAllWorklogs, user?.email, staff]);

  const staffEmails = useMemo(
    () =>
      [...new Set(worklogs.map((log) => String(log.User_Email || '').trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [worklogs]
  );

  const pendingLeaves = visibleLogs.filter(
    (log) => log.Entry_Type === ENTRY_TYPES.LEAVE && leaveStatusOf(log) === 'Pending'
  );

  const reviewLeave = async (log, status) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await updateWorklog(log.Log_ID, {
        Leave_Status: status,
        Reviewed_By: user?.email || user?.name || '',
      });
      try {
        await sendLeaveDecisionEmail({
          to: log.User_Email,
          status,
          date: log.Date,
          reason: log.Leave_Reason,
          reviewedBy: user?.name || user?.email,
        });
        setNotice(`Leave ${status.toLowerCase()}. Email sent to ${log.User_Email}.`);
      } catch (mailError) {
        setError(
          `Leave ${status.toLowerCase()}, but the email could not be sent: ${mailError.message}`
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

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
        {privileges.canViewAllWorklogs ? (
          <p className="mt-1 text-sm text-slate-500">
            Admins can review every staff work log and approve or reject leave requests.
          </p>
        ) : null}
        {error ? <p className="mt-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        {notice ? <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{notice}</p> : null}

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">
            {privileges.canViewAllWorklogs ? 'Staff work logs and leave' : 'Your recent entries'}
          </h3>
          {privileges.canViewAllWorklogs && staffEmails.length > 1 ? (
            <label className="text-xs font-medium text-slate-600">
              Staff
              <select
                className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
                value={staff}
                onChange={(event) => setStaff(event.target.value)}
              >
                <option value="All">All staff</option>
                {staffEmails.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {notice ? <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{notice}</p> : null}
        {privileges.canReviewLeave && pendingLeaves.length ? (
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">Pending leave ({pendingLeaves.length})</p>
            <div className="mt-2 space-y-2">
              {pendingLeaves.map((log) => (
                <article key={`pending-${log.Log_ID}`} className="rounded border border-amber-100 bg-white p-2 text-sm">
                  <p className="text-xs text-slate-500">
                    {log.Date} · {log.User_Email}
                  </p>
                  <p className="mt-1">{log.Leave_Reason}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                      onClick={() => reviewLeave(log, 'Approved')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                      onClick={() => reviewLeave(log, 'Rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3 space-y-3">
          {visibleLogs.length === 0 ? <p className="text-sm text-slate-500">No logs yet.</p> : null}
          {visibleLogs.map((log) => {
            const leaveStatus = leaveStatusOf(log);
            return (
              <article key={log.Log_ID} className="rounded border border-slate-100 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    {log.Date} · {log.Entry_Type}
                    {privileges.canViewAllWorklogs ? ` · ${log.User_Email}` : ''}
                  </p>
                  {leaveStatus ? (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${leaveStatusColor(leaveStatus)}`}>
                      {leaveStatus}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1">{log.Entry_Type === ENTRY_TYPES.LEAVE ? log.Leave_Reason : log.Work_Summary}</p>
                {log.Rescheduled_Sessions ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Rescheduled: {formatRescheduled(log.Rescheduled_Sessions)}
                  </p>
                ) : null}
                {log.Reviewed_By && leaveStatus && leaveStatus !== 'Pending' ? (
                  <p className="mt-1 text-[11px] text-slate-500">Reviewed by {log.Reviewed_By}</p>
                ) : null}
              </article>
            );
          })}
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
