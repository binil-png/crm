import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import {
  TRAINING_STATUSES,
  WORK_TYPES,
  clientWorkType,
  findLeadForClient,
  isTrainingCompleted,
  isTrainingNotStarted,
  isTrainingOngoing,
  normalizeTrainingStatus,
  trainingColor,
  workTypeColor,
} from '../../utils/constants';
import ScheduleSessionModal from './ScheduleSessionModal';
import SessionList from './SessionList';
import WorkTypeSelect from './WorkTypeSelect';

export default function ClientList() {
  const { user } = useAuth();
  const { clients, leads, pickClient, sessions, setClientTrainingStatus, updateClient } = useCrmStore();
  const [statusFilter, setStatusFilter] = useState('Not started');
  const [typeFilter, setTypeFilter] = useState('All');
  const [scheduling, setScheduling] = useState(null);
  const [openId, setOpenId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const counts = useMemo(() => {
    const byStatus = {
      'Not started': clients.filter(isTrainingNotStarted).length,
      Ongoing: clients.filter(isTrainingOngoing).length,
      Completed: clients.filter(isTrainingCompleted).length,
      All: clients.length,
    };
    const byType = {
      All: clients.length,
      Training: clients.filter((client) => clientWorkType(client) === 'Training').length,
      'Doubt clarification': clients.filter((client) => clientWorkType(client) === 'Doubt clarification').length,
    };
    return { byStatus, byType };
  }, [clients]);

  const visible = clients.filter((client) => {
    const status = normalizeTrainingStatus(client.Training_Status);
    if (statusFilter !== 'All' && status !== statusFilter) return false;
    if (typeFilter !== 'All' && clientWorkType(client) !== typeFilter) return false;
    return true;
  });

  const run = async (clientId, action) => {
    setBusyId(clientId);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const pick = async (client) => {
    await run(client.Client_ID, async () => {
      await pickClient(client.Client_ID, user?.email || '');
      setStatusFilter('Ongoing');
    });
  };

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Clients from sales</h2>
        <p className="text-sm text-slate-500">
          Status is Not started, Ongoing, or Completed. Work is Training or Doubt clarification. Pick a client, then
          schedule the matching session.
        </p>
      </div>

      {error ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}

      <div className="mb-3 flex flex-wrap gap-2">
        {['Not started', 'Ongoing', 'Completed', 'All'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatusFilter(item)}
            className={`rounded px-3 py-1.5 text-sm ${
              statusFilter === item ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white'
            }`}
          >
            {item} ({counts.byStatus[item]})
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {['All', ...WORK_TYPES].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTypeFilter(item)}
            className={`rounded px-3 py-1.5 text-sm ${
              typeFilter === item ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white'
            }`}
          >
            {item} ({counts.byType[item]})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            {statusFilter === 'Not started'
              ? 'No clients are waiting. Sales can pass a completed lead to this queue.'
              : 'No clients in this view.'}
          </p>
        ) : null}

        {visible.map((client) => {
          const source = findLeadForClient(leads, client);
          const relatedSessions = sessions.filter((session) => session.Client_ID === client.Client_ID);
          const status = normalizeTrainingStatus(client.Training_Status);
          const workType = clientWorkType(client);
          const notStarted = isTrainingNotStarted(client);
          const mine = client.Assigned_Trainer && client.Assigned_Trainer === user?.email;

          return (
            <article key={client.Client_ID} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{client.Client_Name}</h3>
                  <p className="text-sm text-slate-500">{client.Contact_Email || 'No email on file'}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {source
                      ? `From ${source._sheet} #${source['Sl No']} · ${source.Executive || 'Sales'} · ${source.Specialization || '—'}`
                      : `Lead ${client.Lead_ID || '—'} · ${client.Client_ID}`}
                  </p>
                  {source?.['Contact Number'] ? (
                    <p className="text-xs text-slate-500">{source['Contact Number']}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${workTypeColor(workType)}`}>{workType}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${trainingColor(status)}`}>{status}</span>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  Status
                  <select
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    value={status}
                    disabled={busyId === client.Client_ID}
                    onChange={(event) =>
                      run(client.Client_ID, () => setClientTrainingStatus(client.Client_ID, event.target.value))
                    }
                  >
                    {TRAINING_STATUSES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <div className="text-sm">
                  <p className="mb-1">Type</p>
                  <WorkTypeSelect
                    value={workType}
                    onChange={(next) => run(client.Client_ID, () => updateClient(client.Client_ID, { Work_Type: next }))}
                  />
                </div>
              </div>

              {client.Assigned_Trainer ? (
                <p className="mt-2 text-sm text-slate-600">
                  Trainer: {client.Assigned_Trainer}
                  {mine ? ' (you)' : ''}
                </p>
              ) : (
                <p className="mt-2 text-sm text-amber-700">Not picked yet</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {notStarted ? (
                  <button
                    type="button"
                    disabled={busyId === client.Client_ID}
                    className="rounded bg-sky-700 px-3 py-2 text-sm text-white disabled:opacity-50"
                    onClick={() => pick(client)}
                  >
                    {busyId === client.Client_ID ? 'Saving…' : 'Assign to me'}
                  </button>
                ) : null}

                {!notStarted && !isTrainingCompleted(client) && !mine ? (
                  <button
                    type="button"
                    disabled={busyId === client.Client_ID}
                    className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                    onClick={() => pick(client)}
                  >
                    Reassign to me
                  </button>
                ) : null}

                <button
                  type="button"
                  className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
                  onClick={() => setScheduling(client)}
                >
                  Schedule session
                </button>

                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                  onClick={() => setOpenId((id) => (id === client.Client_ID ? '' : client.Client_ID))}
                >
                  {openId === client.Client_ID
                    ? 'Hide sessions'
                    : `View sessions (${relatedSessions.length})`}
                </button>
              </div>

              {openId === client.Client_ID ? (
                <div className="mt-4">
                  <SessionList clientId={client.Client_ID} compact />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {scheduling ? <ScheduleSessionModal client={scheduling} onClose={() => setScheduling(null)} /> : null}
    </section>
  );
}
