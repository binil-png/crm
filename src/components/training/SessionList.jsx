import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import {
  WORK_TYPES,
  formatDateTime,
  listTrainingTeam,
  normalizeTrainingStatus,
  sameEmail,
  sessionColor,
  sessionWorkType,
  trainingColor,
  workTypeColor,
} from '../../utils/constants';
import TrainerSelect, { ALL_TRAINERS } from './TrainerSelect';

export default function SessionList({ clientId, compact = false }) {
  const { user } = useAuth();
  const { sessions, clients, users, completeSession, updateSession } = useCrmStore();
  const team = useMemo(
    () => listTrainingTeam({ clients, sessions, users, extra: [user?.email], currentEmail: user?.email }),
    [clients, sessions, users, user?.email]
  );
  const [typeFilter, setTypeFilter] = useState('All');
  const [trainerFilter, setTrainerFilter] = useState(ALL_TRAINERS);
  const rows = sessions
    .filter((session) => !clientId || session.Client_ID === clientId)
    .filter((session) => typeFilter === 'All' || sessionWorkType(session) === typeFilter)
    .filter((session) => trainerFilter === ALL_TRAINERS || sameEmail(session.Trainer_Email, trainerFilter))
    .sort((a, b) => new Date(a.Start_Time) - new Date(b.Start_Time));

  const clientFor = (id) => clients.find((client) => client.Client_ID === id);
  const trainerName = (email) => {
    const member = team.find((item) => sameEmail(item.email, email));
    if (!member) return email || 'Unassigned';
    return sameEmail(member.email, user?.email) ? `${member.name} (you)` : member.name;
  };

  if (!rows.length) {
    return (
      <div>
        {!compact ? (
          <Filters
            typeFilter={typeFilter}
            onType={setTypeFilter}
            trainerFilter={trainerFilter}
            onTrainer={setTrainerFilter}
            team={team}
            currentEmail={user?.email}
          />
        ) : null}
        <p className="text-sm text-slate-500">No sessions yet.</p>
      </div>
    );
  }

  return (
    <div>
      {!compact ? (
        <Filters
          typeFilter={typeFilter}
          onType={setTypeFilter}
          trainerFilter={trainerFilter}
          onTrainer={setTrainerFilter}
          team={team}
          currentEmail={user?.email}
        />
      ) : null}
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {!compact ? <th className="px-3 py-2">Client</th> : null}
              <th className="px-3 py-2">Session</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Trainer</th>
              <th className="px-3 py-2">Client status</th>
              <th className="px-3 py-2">Session status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((session) => {
              const client = clientFor(session.Client_ID);
              const clientStatus = normalizeTrainingStatus(client?.Training_Status);
              return (
                <tr key={session.Session_ID} className="border-t border-slate-100">
                  {!compact ? <td className="px-3 py-2">{client?.Client_Name || session.Client_ID}</td> : null}
                  <td className="px-3 py-2">
                    <p>{session.Session_Title}</p>
                    <p className="text-xs text-slate-500">{session.Session_ID}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${workTypeColor(sessionWorkType(session))}`}>
                      {sessionWorkType(session)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {formatDateTime(session.Start_Time)}
                    <p className="text-xs text-slate-500">to {formatDateTime(session.End_Time)}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{trainerName(session.Trainer_Email)}</p>
                    <p className="text-xs text-slate-500">{session.Trainer_Email}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${trainingColor(clientStatus)}`}>{clientStatus}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${sessionColor(session.Status)}`}>{session.Status}</span>
                  </td>
                  <td className="px-3 py-2">
                    {session.Status !== 'Completed' && session.Status !== 'Cancelled' ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-emerald-700"
                          onClick={() => completeSession(session)}
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          className="text-xs text-rose-700"
                          onClick={() => updateSession(session.Session_ID, { Status: 'Cancelled' })}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Filters({ typeFilter, onType, trainerFilter, onTrainer, team, currentEmail }) {
  return (
    <div className="mb-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-2">
        {['All', ...WORK_TYPES].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onType(item)}
            className={`rounded px-3 py-1.5 text-sm ${
              typeFilter === item ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="min-w-[240px]">
        <TrainerSelect
          compact
          allowAll
          label="View trainer"
          value={trainerFilter}
          onChange={onTrainer}
          team={team}
          currentEmail={currentEmail}
        />
      </div>
    </div>
  );
}
