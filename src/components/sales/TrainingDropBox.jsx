import { useMemo, useState } from 'react';
import { GraduationCap, GripVertical } from 'lucide-react';
import { useCrmStore } from '../../store/crmStore';
import {
  findClientForLead,
  findLeadForClient,
  formatDdMmYyyyHm,
  leadKey,
  listTrainingTeam,
  normalizeStatus,
  parseSheetDate,
  trainerLabel,
  trainingColor,
} from '../../utils/constants';
import ScheduleDateTimeFields from './ScheduleDateTimeFields';
import TrainerSelect from '../training/TrainerSelect';

const readPayload = (event) => {
  try {
    return JSON.parse(event.dataTransfer.getData('text/plain') || '{}');
  } catch {
    return {};
  }
};

const isWon = (lead) => normalizeStatus(lead?.Status) === 'Demo Done-Closed';

export default function TrainingDropBox({ leads }) {
  const { clients, sessions, passToTraining, pickClient, scheduleSessions } = useCrmStore();
  const team = useMemo(() => listTrainingTeam({ clients, sessions }), [clients, sessions]);
  const [trainerEmail, setTrainerEmail] = useState(team[0]?.email || '');
  const [scheduleAt, setScheduleAt] = useState(
    formatDdMmYyyyHm(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  const [duration, setDuration] = useState(60);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState({});

  const waiting = useMemo(
    () => leads.filter((lead) => isWon(lead) && !findClientForLead(clients, lead)),
    [leads, clients]
  );

  const passed = useMemo(
    () =>
      clients.filter((client) => {
        const lead = findLeadForClient(leads, client);
        return !lead || isWon(lead);
      }),
    [clients, leads]
  );

  const trainerFor = (client) =>
    String(trainerEmail || draft[client?.Client_ID] || client?.Assigned_Trainer || '').trim();

  const handOff = async (lead) => {
    if (!lead) {
      setError('Drop a closed lead from the table.');
      return;
    }
    if (!isWon(lead)) {
      setError('Only Demo Done-Closed leads can be passed to training.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const client = await passToTraining(lead);
      const trainer = trainerEmail.trim();
      if (trainer) {
        await pickClient(client.Client_ID, trainer);
        setDraft((prev) => ({ ...prev, [client.Client_ID]: trainer }));
        setMessage(`${lead['Customer Name']} passed and assigned to ${trainer}.`);
      } else {
        setMessage(`${lead['Customer Name']} passed to the training team.`);
      }
    } catch (err) {
      setError(err.message || 'Could not pass this lead to training.');
    } finally {
      setBusy(false);
    }
  };

  const scheduleForClient = async (event, client) => {
    event.preventDefault();
    event.stopPropagation();
    const trainer = trainerFor(client);
    const start = parseSheetDate(scheduleAt);
    if (!trainer) {
      setError('Select a training team member first.');
      setMessage('');
      return;
    }
    if (!start) {
      setError('Set a training date and time.');
      setMessage('');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await pickClient(client.Client_ID, trainer);
      await scheduleSessions({
        client: { ...client, Assigned_Trainer: trainer },
        trainerEmail: trainer,
        sessions: [
          {
            title: `Training · ${client.Client_Name}`,
            start,
            end: new Date(start.getTime() + duration * 60 * 1000),
          },
        ],
      });
      setDraft((prev) => ({ ...prev, [client.Client_ID]: trainer }));
      setMessage(`Training for ${client.Client_Name} scheduled with ${trainerLabel(trainer)}.`);
    } catch (err) {
      setError(err.message || 'Could not schedule training.');
    } finally {
      setBusy(false);
    }
  };

  const assignClient = async (event, client) => {
    event.preventDefault();
    event.stopPropagation();
    const email = trainerFor(client);
    if (!email) {
      setError('Enter a trainer email, then click Assign.');
      setMessage('');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await pickClient(client.Client_ID, email);
      setDraft((prev) => ({ ...prev, [client.Client_ID]: email }));
      setMessage(`${client.Client_Name} assigned to ${email}.`);
    } catch (err) {
      setError(err.message || 'Could not assign this lead.');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = async (event) => {
    event.preventDefault();
    setOver(false);
    const payload = readPayload(event);
    const lead =
      payload.kind === 'lead'
        ? leads.find((item) => leadKey(item) === payload.key)
        : null;
    await handOff(lead);
  };

  return (
    <aside className="rounded-lg border border-sky-200 bg-sky-50 p-3">
      <div className="mb-3 flex items-start gap-2">
        <GraduationCap size={18} className="mt-0.5 text-sky-700" />
        <div>
          <h3 className="text-sm font-semibold">Training box</h3>
          <p className="text-xs text-slate-500">Drag a Demo Done-Closed lead here to assign training.</p>
        </div>
      </div>

      <div className="mb-3 space-y-2">
        <TrainerSelect compact value={trainerEmail} onChange={setTrainerEmail} team={team} />
        <ScheduleDateTimeFields
          value={scheduleAt}
          onChange={setScheduleAt}
          dateLabel="Training date"
          timeLabel="Training time"
        />
        <label className="block text-xs text-slate-600">
          Duration
          <select
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
          >
            {[30, 60, 90].map((item) => (
              <option key={item} value={item}>
                {item} min
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-4 text-center text-sm ${
          over ? 'border-sky-600 bg-sky-100 text-sky-800' : 'border-sky-300 bg-white text-slate-500'
        }`}
      >
        {busy ? 'Passing to training…' : over ? 'Release to assign training' : 'Drop closed lead here'}
      </div>

      {error ? <p className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-700">{error}</p> : null}
      {message ? <p className="mt-2 rounded bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p> : null}

      {waiting.length ? (
        <section className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Ready to pass ({waiting.length})
          </p>
          <div className="space-y-2">
            {waiting.map((lead) => (
              <div
                key={leadKey(lead)}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'lead', key: leadKey(lead) }));
                  event.dataTransfer.effectAllowed = 'copy';
                }}
                className="flex cursor-grab items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 active:cursor-grabbing"
              >
                <GripVertical size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{lead['Customer Name']}</p>
                  <p className="truncate text-xs text-slate-500">
                    {lead._sheet} #{lead['Sl No']} · {lead.Executive || 'Sales'}
                  </p>
                </div>
                <button
                  type="button"
                  className="ml-auto shrink-0 rounded bg-sky-700 px-2 py-1 text-[11px] text-white"
                  onClick={() => handOff(lead)}
                >
                  Pass
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Assigned to training ({passed.length})
        </p>
        {passed.length === 0 ? (
          <p className="text-xs text-slate-400">No closed leads have been passed yet.</p>
        ) : (
          <div className="max-h-[240px] space-y-2 overflow-auto">
            {passed.map((client) => (
              <article key={client.Client_ID} className="rounded-lg border border-sky-100 bg-white p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{client.Client_Name}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${trainingColor(client.Training_Status)}`}>
                    {client.Training_Status || 'Pending Assignment'}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">{client.Contact_Email || 'No email'}</p>
                {client.Assigned_Trainer ? (
                  <p className="mt-1 truncate text-[11px] text-sky-800">Trainer: {trainerLabel(client.Assigned_Trainer)}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-amber-700">Not assigned yet</p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  className="mt-2 w-full rounded bg-sky-700 px-2 py-1.5 text-xs text-white disabled:opacity-50"
                  onClick={(event) => assignClient(event, client)}
                >
                  {busy ? 'Saving…' : 'Assign trainer'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="mt-1 w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white disabled:opacity-50"
                  onClick={(event) => scheduleForClient(event, client)}
                >
                  {busy ? 'Scheduling…' : 'Schedule training'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
