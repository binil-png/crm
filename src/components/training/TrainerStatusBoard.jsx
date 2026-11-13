import {
  isTrainingCompleted,
  isTrainingNotStarted,
  isTrainingOngoing,
  sameEmail,
  trainingColor,
} from '../../utils/constants';
import { ALL_TRAINERS } from './TrainerSelect';

export default function TrainerStatusBoard({
  team = [],
  clients = [],
  sessions = [],
  currentEmail = '',
  selectedEmail = ALL_TRAINERS,
  onSelect,
}) {
  const unassigned = clients.filter((client) => !String(client.Assigned_Trainer || '').trim());
  const rows = [
    {
      key: ALL_TRAINERS,
      name: 'All trainers',
      email: '',
      clients,
      mine: false,
    },
    ...team.map((member) => ({
      key: member.email,
      name: sameEmail(member.email, currentEmail) ? `${member.name} (you)` : member.name,
      email: member.email,
      clients: clients.filter((client) => sameEmail(client.Assigned_Trainer, member.email)),
      mine: sameEmail(member.email, currentEmail),
    })),
    {
      key: 'unassigned',
      name: 'Unassigned',
      email: '',
      clients: unassigned,
      mine: false,
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map((row) => {
        const counts = {
          'Not started': row.clients.filter(isTrainingNotStarted).length,
          Ongoing: row.clients.filter(isTrainingOngoing).length,
          Completed: row.clients.filter(isTrainingCompleted).length,
        };
        const sessionCount = sessions.filter(
          (session) =>
            session.Status !== 'Cancelled' &&
            (row.key === ALL_TRAINERS ||
              (row.key === 'unassigned' ? false : sameEmail(session.Trainer_Email, row.email)))
        ).length;
        const active = selectedEmail === row.key;
        return (
          <button
            key={row.key}
            type="button"
            onClick={() => onSelect?.(row.key)}
            className={`rounded-lg border p-3 text-left ${
              active ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="truncate text-sm font-medium">{row.name}</p>
            {row.email ? <p className="truncate text-[11px] text-slate-500">{row.email}</p> : null}
            <p className="mt-2 text-xs text-slate-600">
              {row.clients.length} {row.clients.length === 1 ? 'client' : 'clients'}
              {row.key !== 'unassigned' ? ` · ${sessionCount} sessions` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(counts).map(([status, count]) => (
                <span key={status} className={`rounded px-1.5 py-0.5 text-[10px] ${trainingColor(status)}`}>
                  {status} {count}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
