import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { findLeadForClient, trainingColor } from '../../utils/constants';
import ScheduleSessionModal from './ScheduleSessionModal';
import SessionList from './SessionList';

const FILTERS = [
  { id: 'waiting', label: 'Waiting for pickup' },
  { id: 'picked', label: 'Picked / In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
];

const isWaiting = (client) => !client.Training_Status || client.Training_Status === 'Pending Assignment';
const isPicked = (client) => client.Training_Status === 'In Progress';
const isCompleted = (client) => client.Training_Status === 'Completed';

export default function ClientList() {
  const { user } = useAuth();
  const { clients, leads, pickClient, sessions } = useCrmStore();
  const [filter, setFilter] = useState('waiting');
  const [scheduling, setScheduling] = useState(null);
  const [openId, setOpenId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const counts = useMemo(
    () => ({
      waiting: clients.filter(isWaiting).length,
      picked: clients.filter(isPicked).length,
      completed: clients.filter(isCompleted).length,
      all: clients.length,
    }),
    [clients]
  );

  const visible = clients.filter((client) => {
    if (filter === 'waiting') return isWaiting(client);
    if (filter === 'picked') return isPicked(client);
    if (filter === 'completed') return isCompleted(client);
    return true;
  });

  const pick = async (client) => {
    setBusyId(client.Client_ID);
    setError('');
    try {
      await pickClient(client.Client_ID, user?.email || '');
      setFilter('picked');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Clients from sales</h2>
        <p className="text-sm text-slate-500">
          Closed accounts passed by the sales team. Pick a client for training, then schedule sessions.
        </p>
      </div>

      {error ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded px-3 py-1.5 text-sm ${
              filter === item.id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white'
            }`}
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            {filter === 'waiting'
              ? 'No clients are waiting. Sales can pass a Demo Done-Closed lead to this queue.'
              : 'No training clients in this view.'}
          </p>
        ) : null}

        {visible.map((client) => {
          const source = findLeadForClient(leads, client);
          const relatedSessions = sessions.filter((session) => session.Client_ID === client.Client_ID);
          const waiting = isWaiting(client);
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
                <span className={`rounded px-2 py-0.5 text-xs ${trainingColor(client.Training_Status)}`}>
                  {client.Training_Status || 'Pending Assignment'}
                </span>
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
                {waiting ? (
                  <button
                    type="button"
                    disabled={busyId === client.Client_ID}
                    className="rounded bg-sky-700 px-3 py-2 text-sm text-white disabled:opacity-50"
                    onClick={() => pick(client)}
                  >
                    {busyId === client.Client_ID ? 'Picking…' : 'Pick for training'}
                  </button>
                ) : null}

                {!waiting && !isCompleted(client) && !mine ? (
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
                  Schedule training
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
