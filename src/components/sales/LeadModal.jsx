import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { createCalendarEvent } from '../../services/calendarService';
import {
  LEAD_SOURCES,
  LANGUAGES,
  PIPELINE_STATUSES,
  REGIONS,
  SPECIALIZATIONS,
  appendStageComment,
  findClientForLead,
  formatDdMmYyyyHm,
  formatScheduleRelative,
  fromLocalInput,
  getCallScheduleState,
  getLeadScheduleAt,
  isClosedStatus,
  isDemoStatus,
  leadKey,
  nextSalesActions,
  parseStageComments,
  toLocalInput,
} from '../../utils/constants';
import Modal from '../shared/Modal';
import ScheduleDateTimeFields from './ScheduleDateTimeFields';

export default function LeadModal({ lead, onClose, onCloseDeal, mode = 'full' }) {
  const { user } = useAuth();
  const { updateLead, passToTraining, scheduleCall, clients } = useCrmStore();
  const commentsOnly = mode === 'comments';
  const [form, setForm] = useState({ ...lead });
  const [stageNote, setStageNote] = useState('');
  const [demoStart, setDemoStart] = useState(toLocalInput(lead['Scheduled Date']) || toLocalInput(new Date().toISOString()));
  const [demoEnd, setDemoEnd] = useState(toLocalInput(new Date(Date.now() + 60 * 60 * 1000).toISOString()));
  const [callStart, setCallStart] = useState(
    toLocalInput(lead['Scheduled Date']) || toLocalInput(new Date(Date.now() + 30 * 60 * 1000).toISOString())
  );
  const [callMinutes, setCallMinutes] = useState(30);
  const [attendees, setAttendees] = useState([lead['Email ID'], user?.email].filter(Boolean).join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const actions = nextSalesActions(form.Status);
  const closed = isClosedStatus(form.Status);
  const trainingClient = findClientForLead(clients, form);
  const scheduleAt = getLeadScheduleAt(form);
  const scheduleState = getCallScheduleState(form, new Date());

  const persist = async (next, note) => {
    const comments = note ? appendStageComment(next.Comments, note) : next.Comments;
    const saved = await updateLead(lead, { ...next, Comments: comments });
    setForm(saved);
    return saved;
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await persist(form, stageNote);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const applyStatus = async (status) => {
    setBusy(true);
    setError('');
    try {
      if (status === 'Demo Scheduled') {
        if (!demoStart) {
          setError('Set a scheduled date for the demo.');
          setBusy(false);
          return;
        }
        try {
          await createCalendarEvent({
            title: `Demo - ${form['Customer Name']}`,
            start: fromLocalInput(demoStart),
            end: fromLocalInput(demoEnd || demoStart),
            attendees,
            description: `Sales demo for ${form['Customer Name']}`,
          });
        } catch (calendarError) {
          console.warn(calendarError);
        }
      }
      const note = stageNote || `Status changed to ${status}`;
      const scheduled = status === 'Demo Scheduled' ? formatDdMmYyyyHm(new Date(demoStart)) : form['Scheduled Date'];
      await persist({ ...form, Status: status, 'Scheduled Date': scheduled }, note);
      setStageNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const bookCall = async () => {
    if (!callStart) {
      setError('Set a date and time for the call.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const start = fromLocalInput(callStart);
      const end = new Date(new Date(start).getTime() + callMinutes * 60 * 1000).toISOString();
      const saved = await scheduleCall(form, {
        start,
        end,
        note: stageNote || `Call scheduled for ${formatDdMmYyyyHm(new Date(start))}`,
      });
      setForm(saved);
      setStageNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handOff = async () => {
    setBusy(true);
    setError('');
    try {
      await passToTraining(form);
      const next = useCrmStore.getState().leads.find((item) => leadKey(item) === leadKey(form));
      if (next) setForm(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const commentsPanel = (
        <div className={commentsOnly ? '' : 'md:col-span-2 rounded border border-slate-200 p-3'}>
          <p className="text-sm font-medium">Comments</p>
          <div className="mt-2 space-y-1">
            {parseStageComments(form.Comments).length === 0 ? (
              <p className="text-sm text-slate-500">No comments yet.</p>
            ) : (
              parseStageComments(form.Comments).map((item) => (
                <p key={item.num} className="rounded bg-slate-50 px-2 py-1 text-sm">
                  {item.raw}
                </p>
              ))
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
              value={stageNote}
              onChange={(e) => setStageNote(e.target.value)}
              placeholder={`Stage ${parseStageComments(form.Comments).reduce((max, item) => Math.max(max, item.num), 0) + 1} message`}
            />
            <button
              type="button"
              disabled={busy || !stageNote.trim()}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await persist(form, stageNote.trim());
                  setStageNote('');
                } catch (err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Add comment
            </button>
          </div>
        </div>
  );

  if (commentsOnly) {
    return (
      <Modal title={`Comments · ${form['Customer Name']}`} onClose={onClose}>
        {error ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        {commentsPanel}
      </Modal>
    );
  }

  return (
    <Modal title={`${form['Customer Name']} · ${form._sheet} #${form['Sl No']}`} onClose={onClose} wide>
      {error ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
      {scheduleState === 'overdue' ? (
        <p className="mb-3 rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
          Overdue: this call was scheduled for {scheduleAt.toLocaleString()} ({formatScheduleRelative(scheduleAt)}).
        </p>
      ) : null}
      {scheduleState === 'soon' ? (
        <p className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
          Starting soon: call {lead['Customer Name']} {formatScheduleRelative(scheduleAt)}.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {[
          ['Customer Name', 'Customer Name'],
          ['Executive', 'Executive'],
          ['Email ID', 'Email ID'],
          ['Contact Number', 'Contact Number'],
          ['Country', 'Country'],
          ['State', 'State'],
          ['City', 'City'],
          ['Source(Remarks)', 'Source(Remarks)'],
        ].map(([key, label]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={form[key] || ''}
              onChange={(e) => setField(key, e.target.value)}
            />
          </label>
        ))}

        <label className="block text-sm">
          Source
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Source || ''}
            onChange={(e) => setField('Source', e.target.value)}
          >
            {LEAD_SOURCES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Specialization
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Specialization || ''}
            onChange={(e) => setField('Specialization', e.target.value)}
          >
            <option value=""></option>
            {SPECIALIZATIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Language
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Language || ''}
            onChange={(e) => setField('Language', e.target.value)}
          >
            <option value=""></option>
            {LANGUAGES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Region
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Region || 'Domestic'}
            onChange={(e) => setField('Region', e.target.value)}
          >
            {REGIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Status
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Status}
            onChange={(e) => setField('Status', e.target.value)}
          >
            {PIPELINE_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <ScheduleDateTimeFields
            value={form['Scheduled Date']}
            onChange={(next) => {
              setField('Scheduled Date', next);
              const local = toLocalInput(next);
              if (local) {
                setCallStart(local);
                setDemoStart(local);
              }
            }}
          />
        </div>
        {commentsPanel}
      </div>

      {!closed ? (
        <div className="mt-4 rounded border border-slate-200 p-3">
          <p className="text-sm font-medium">Schedule a call</p>
          <p className="text-xs text-slate-500">Saves the time on the lead and creates a calendar event.</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <ScheduleDateTimeFields
                value={callStart}
                onChange={(next) => {
                  setCallStart(toLocalInput(next));
                  setField('Scheduled Date', next);
                }}
                dateLabel="Call date"
                timeLabel="Call time"
              />
            </div>
            <label className="text-sm">
              Duration
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={callMinutes}
                onChange={(e) => setCallMinutes(Number(e.target.value))}
              >
                {[15, 30, 45, 60].map((item) => (
                  <option key={item} value={item}>
                    {item} min
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={bookCall}
            className="mt-3 rounded bg-sky-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? 'Scheduling…' : 'Schedule call'}
          </button>
        </div>
      ) : null}

      {isDemoStatus(form.Status) || form.Status === 'Demo Scheduled' ? (
        <div className="mt-4 rounded border border-slate-200 p-3">
          <p className="text-sm font-medium">Demo schedule</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Start
              <input
                type="datetime-local"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={demoStart}
                onChange={(e) => setDemoStart(e.target.value)}
              />
            </label>
            <label className="text-sm">
              End
              <input
                type="datetime-local"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={demoEnd}
                onChange={(e) => setDemoEnd(e.target.value)}
              />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            Attendee emails
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />
          </label>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white">
          Save lead
        </button>
        {actions.map((status) => (
          <button
            key={status}
            type="button"
            disabled={busy}
            onClick={() => applyStatus(status)}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            {status}
          </button>
        ))}
        {!closed ? (
          <button type="button" onClick={() => onCloseDeal(form)} className="rounded bg-emerald-700 px-4 py-2 text-white">
            Close lead
          </button>
        ) : null}
        {form.Status === 'Demo Done-Closed' && !trainingClient ? (
          <button
            type="button"
            disabled={busy}
            onClick={handOff}
            className="rounded bg-sky-700 px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Passing…' : 'Pass to training team'}
          </button>
        ) : null}
        {trainingClient ? (
          <span className="self-center text-sm text-sky-800">
            Passed to training · {trainingClient.Training_Status}
            {trainingClient.Assigned_Trainer ? ` · ${trainingClient.Assigned_Trainer}` : ''}
          </span>
        ) : null}
      </div>
    </Modal>
  );
}
