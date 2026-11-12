import { useMemo, useState } from 'react';
import { GraduationCap, GripVertical } from 'lucide-react';
import { useCrmStore } from '../../store/crmStore';
import {
  findClientForLead,
  findLeadForClient,
  isCompletedLead,
  isCompletedLeadDrag,
  leadKey,
  setCompletedLeadDrag,
  normalizeTrainingStatus,
  trainerLabel,
  trainingColor,
} from '../../utils/constants';

const readPayload = (event) => {
  try {
    return JSON.parse(event.dataTransfer.getData('text/plain') || '{}');
  } catch {
    return {};
  }
};

export default function TrainingDropBox({ leads }) {
  const { clients, passToTraining } = useCrmStore();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const waiting = useMemo(
    () => leads.filter((lead) => isCompletedLead(lead) && !findClientForLead(clients, lead)),
    [leads, clients]
  );

  const passed = useMemo(
    () =>
      clients.filter((client) => {
        const lead = findLeadForClient(leads, client);
        return !lead || isCompletedLead(lead);
      }),
    [clients, leads]
  );

  const handOff = async (lead) => {
    if (!lead) {
      setError('Drop a completed lead from the table.');
      return;
    }
    if (!isCompletedLead(lead)) {
      setError('Only completed (Demo Done-Closed) leads can be passed to training.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await passToTraining(lead);
      setMessage(`${lead['Customer Name']} passed to the training team.`);
    } catch (err) {
      setError(err.message || 'Could not pass this lead to training.');
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
          <p className="text-xs text-slate-500">
            Pass a completed lead here. The training team will assign themselves.
          </p>
        </div>
      </div>

      <div
        onDragOver={(event) => {
          if (!isCompletedLeadDrag(event)) {
            event.dataTransfer.dropEffect = 'none';
            setOver(false);
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-4 text-center text-sm ${
          over ? 'border-sky-600 bg-sky-100 text-sky-800' : 'border-sky-300 bg-white text-slate-500'
        }`}
      >
        {busy ? 'Passing to training…' : over ? 'Release to pass to training' : 'Drop a completed lead here'}
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
                onDragStart={(event) => setCompletedLeadDrag(event, lead)}
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
                  disabled={busy}
                  className="ml-auto shrink-0 rounded bg-sky-700 px-2 py-1 text-[11px] text-white disabled:opacity-50"
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
          Passed to training ({passed.length})
        </p>
        {passed.length === 0 ? (
          <p className="text-xs text-slate-400">No completed leads have been passed yet.</p>
        ) : (
          <div className="max-h-[240px] space-y-2 overflow-auto">
            {passed.map((client) => (
              <article key={client.Client_ID} className="rounded-lg border border-sky-100 bg-white p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{client.Client_Name}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${trainingColor(client.Training_Status)}`}>
                    {normalizeTrainingStatus(client.Training_Status)}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">{client.Contact_Email || 'No email'}</p>
                {client.Assigned_Trainer ? (
                  <p className="mt-1 truncate text-[11px] text-sky-800">
                    Picked by {trainerLabel(client.Assigned_Trainer)}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-amber-700">Waiting for a trainer to pick this up</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
