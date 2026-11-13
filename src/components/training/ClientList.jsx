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
  listTrainingTeam,
  normalizeTrainingStatus,
  sameEmail,
  trainingColor,
  workTypeColor,
} from '../../utils/constants';
import ScheduleSessionModal from './ScheduleSessionModal';
import SessionList from './SessionList';
import TrainerSelect, { ALL_TRAINERS } from './TrainerSelect';
import TrainerStatusBoard from './TrainerStatusBoard';
import WorkTypeSelect from './WorkTypeSelect';

export default function ClientList() {
  const { user } = useAuth();
  const { clients, leads, pickClient, assignTrainer, sessions, users, setClientTrainingStatus, updateClient } =
    useCrmStore();
  const team = useMemo(
    () => listTrainingTeam({ clients, sessions, users, extra: [user?.email], currentEmail: user?.email }),
    [clients, sessions, users, user?.email]
  );
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [trainerFilter, setTrainerFilter] = useState(ALL_TRAINERS);
  const [scheduling, setScheduling] = useState(null);
  const [openId, setOpenId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [assignEmail, setAssignEmail] = useState({});
  const [error, setError] = useState('');

  const scoped = useMemo(() => {
    if (trainerFilter === ALL_TRAINERS) return clients;
    if (trainerFilter === 'unassigned') return clients.filter((client) => !String(client.Assigned_Trainer || '').trim());
    return clients.filter((client) => sameEmail(client.Assigned_Trainer, trainerFilter));
  }, [clients, trainerFilter]);

  const counts = useMemo(() => {
    const byStatus = {
      'Not started': scoped.filter(isTrainingNotStarted).length,
      Ongoing: scoped.filter(isTrainingOngoing).length,
      Completed: scoped.filter(isTrainingCompleted).length,
      All: scoped.length,
    };
    const byType = {
      All: scoped.length,
      Training: scoped.filter((client) => clientWorkType(client) === 'Training').length,
      'Doubt clarification': scoped.filter((client) => clientWorkType(client) === 'Doubt clarification').length,
    };
    return { byStatus, byType };
  }, [scoped]);

  const visible = scoped.filter((client) => {
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

  const pick = async (client, trainerEmail = user?.email || '') => {
    if (!trainerEmail) {
      setError('Select a trainer before assigning.');
      return;
    }
    await run(client.Client_ID, async () => {
      if (isTrainingNotStarted(client)) {
        await pickClient(client.Client_ID, trainerEmail);
        setStatusFilter('Ongoing');
      } else {
        await assignTrainer(client.Client_ID, trainerEmail);
      }
    });
  };

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Clients from sales</h2>
        <p className="text-sm text-slate-500">
          View every trainer’s clients and status, or filter to one person. You stay the default assignee unless you
          pick someone else.
        </p>
      </div>

      {error ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}

      <div className="mb-4">
        <TrainerStatusBoard
          team={team}
          clients={clients}
          sessions={sessions}
          currentEmail={user?.email}
          selectedEmail={trainerFilter}
          onSelect={setTrainerFilter}
        />
      </div>

      <div className="mb-3 max-w-sm">
        <TrainerSelect
          allowAll
          allowUnassigned
          label="View trainer"
          value={trainerFilter}
          onChange={setTrainerFilter}
          team={team}
          currentEmail={user?.email}
        />
      </div>

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
          const mine = sameEmail(client.Assigned_Trainer, user?.email);
          const selectedTrainer = assignEmail[client.Client_ID] || user?.email || '';
          const selectedMember = team.find((member) => sameEmail(member.email, selectedTrainer));
          const alreadyAssigned = sameEmail(client.Assigned_Trainer, selectedTrainer);
          const assignLabel = sameEmail(selectedTrainer, user?.email)
            ? 'Assign to me'
            : `Assign to ${selectedMember?.name || selectedTrainer || 'trainer'}`;

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
                <p className="mt-2 text-sm text-amber-700">Not picked yet — defaults to you</p>
              )}

              {!isTrainingCompleted(client) ? (
                <div className="mt-3 max-w-sm">
                  <TrainerSelect
                    compact
                    label="Training team member"
                    value={selectedTrainer}
                    onChange={(email) => setAssignEmail((prev) => ({ ...prev, [client.Client_ID]: email }))}
                    team={team}
                    currentEmail={user?.email}
                  />
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {!isTrainingCompleted(client) ? (
                  <button
                    type="button"
                    disabled={busyId === client.Client_ID || !selectedTrainer || alreadyAssigned}
                    className="rounded bg-sky-700 px-3 py-2 text-sm text-white disabled:opacity-50"
                    onClick={() => pick(client, selectedTrainer)}
                  >
                    {busyId === client.Client_ID ? 'Saving…' : alreadyAssigned ? 'Assigned' : assignLabel}
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
