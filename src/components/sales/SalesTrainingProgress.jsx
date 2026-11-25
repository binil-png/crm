import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isDemoMode } from '../../services/googleApi';
import { useCrmStore } from '../../store/crmStore';
import {
  TRAINING_STATUSES,
  WORK_TYPES,
  clientWorkType,
  findLeadForClient,
  formatDate,
  isCancelledSession,
  listTrainingTeam,
  normalizeTrainingStatus,
  sameEmail,
  sessionCancelReason,
  trainerLabel,
  trainingColor,
} from '../../utils/constants';
import { ALL_TRAINERS } from '../training/TrainerSelect';

const PROGRESS_GROUPS = [
  { status: 'Not started', title: 'Waiting' },
  { status: 'Ongoing', title: 'In training' },
  { status: 'Completed', title: 'Completed' },
];

export default function SalesTrainingProgress({ compact = false, ribbon = false }) {
  const { user, privileges } = useAuth();
  const { clients, leads, sessions, users } = useCrmStore();
  const [status, setStatus] = useState('All');
  const [workType, setWorkType] = useState('All');
  const [trainer, setTrainer] = useState(ALL_TRAINERS);
  const [executive, setExecutive] = useState('All');

  const mine = useMemo(() => {
    const rows = clients.filter((client) => {
      if (privileges.admin || privileges.teamLead || isDemoMode()) return true;
      const lead = findLeadForClient(leads, client);
      const owner = String(lead?.Executive || '').trim().toLowerCase();
      const me = String(user?.name || '').trim().toLowerCase();
      const email = String(user?.email || '').trim().toLowerCase();
      if (!owner) return true;
      return owner === me || owner === email;
    });
    return rows.sort((a, b) => String(a.Client_Name || '').localeCompare(String(b.Client_Name || '')));
  }, [clients, leads, privileges.admin, privileges.teamLead, user?.email, user?.name]);

  const team = useMemo(
    () => listTrainingTeam({ clients, sessions, users, extra: [user?.email], currentEmail: user?.email }),
    [clients, sessions, users, user?.email]
  );

  const rows = useMemo(
    () =>
      mine.map((client) => {
        const lead = findLeadForClient(leads, client);
        const itemStatus = normalizeTrainingStatus(client.Training_Status);
        const meta = PROGRESS_GROUPS.find((item) => item.status === itemStatus);
        return {
          client,
          lead,
          status: itemStatus,
          title: meta?.title || itemStatus,
          workType: clientWorkType(client),
          executive: String(lead?.Executive || '').trim(),
          trainer: String(client.Assigned_Trainer || '').trim(),
          cancelledSessions: sessions.filter(
            (session) => session.Client_ID === client.Client_ID && isCancelledSession(session)
          ),
        };
      }),
    [mine, leads, sessions]
  );

  const executives = useMemo(
    () => [...new Set(rows.map((row) => row.executive).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const trainerNameOf = (email) => {
    if (!email) return '';
    const member = team.find((item) => sameEmail(item.email, email));
    if (member?.name) return member.name;
    const labeled = trainerLabel(email);
    return labeled === email ? email : labeled.replace(/\s*\([^)]*\)\s*$/, '');
  };

  const trainerNames = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      if (!row.trainer) return;
      const key = row.trainer.toLowerCase();
      if (map.has(key)) return;
      map.set(key, { email: row.trainer, name: trainerNameOf(row.trainer) || row.trainer });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, team]);

  const grouped = useMemo(
    () =>
      TRAINING_STATUSES.map((item) => ({
        status: item,
        rows: mine.filter((client) => normalizeTrainingStatus(client.Training_Status) === item),
      })),
    [mine]
  );

  const visible = rows.filter((row) => {
    if (status !== 'All' && row.status !== status) return false;
    if (workType !== 'All' && row.workType !== workType) return false;
    if (executive !== 'All' && row.executive !== executive) return false;
    if (trainer === 'unassigned') return !row.trainer;
    if (trainer !== ALL_TRAINERS && !sameEmail(row.trainer, trainer)) return false;
    return true;
  });
  const counts = Object.fromEntries(grouped.map((group) => [group.status, group.rows.length]));

  if (ribbon) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sky-950">Client training</p>
          <p className="text-[11px] text-sky-800">Progress</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {TRAINING_STATUSES.map((item) => (
            <div key={item} className="rounded-md border border-sky-100 bg-white px-2.5 py-1 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{item}</p>
              <p className="text-sm font-semibold text-slate-800">{counts[item] || 0}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className={compact ? '' : 'rounded-lg border border-slate-200 bg-white p-4'}>
      <div className={compact ? 'mb-3' : 'mb-4 flex flex-wrap items-end justify-between gap-3'}>
        <div>
          <h2 className={compact ? 'text-sm font-semibold' : 'text-lg font-semibold'}>Training progress</h2>
        </div>
        <p className="text-xs text-slate-500">
          {visible.length} of {rows.length}
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'md:grid-cols-3'}`}>
        {PROGRESS_GROUPS.map((item) => (
          <div key={item.status} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.title}</p>
            <p className="text-lg font-semibold text-slate-800">{counts[item.status] || 0}</p>
          </div>
        ))}
      </div>

      {compact ? null : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium text-slate-600">
              Status
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="All">All statuses</option>
                {PROGRESS_GROUPS.map((item) => (
                  <option key={item.status} value={item.status}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Work type
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                value={workType}
                onChange={(event) => setWorkType(event.target.value)}
              >
                <option value="All">All work types</option>
                {WORK_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Trainer name
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                value={trainer}
                onChange={(event) => setTrainer(event.target.value)}
              >
                <option value={ALL_TRAINERS}>All trainer names</option>
                <option value="unassigned">Unassigned</option>
                {trainerNames.map((item) => (
                  <option key={item.email} value={item.email}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Executive
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                value={executive}
                onChange={(event) => setExecutive(event.target.value)}
              >
                <option value="All">All executives</option>
                {executives.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-auto rounded border border-slate-300">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="border border-slate-300 px-3 py-2">Client</th>
                  <th className="border border-slate-300 px-3 py-2">Contact</th>
                  <th className="border border-slate-300 px-3 py-2">Executive</th>
                  <th className="border border-slate-300 px-3 py-2">Work type</th>
                  <th className="border border-slate-300 px-3 py-2">Status</th>
                  <th className="border border-slate-300 px-3 py-2">Trainer</th>
                  <th className="border border-slate-300 px-3 py-2">Cancelled sessions</th>
                  <th className="border border-slate-300 px-3 py-2">Completed</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td className="border border-slate-300 px-3 py-6 text-center text-slate-500" colSpan={8}>
                      No clients match these filters.
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <tr key={row.client.Client_ID} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-3 py-2 font-medium">{row.client.Client_Name || '—'}</td>
                      <td className="border border-slate-300 px-3 py-2 text-slate-600">
                        <p>{row.client.Contact_Email || '—'}</p>
                        {row.lead?.['Contact Number'] ? (
                          <p className="text-xs text-slate-500">{row.lead['Contact Number']}</p>
                        ) : null}
                      </td>
                      <td className="border border-slate-300 px-3 py-2">{row.executive || '—'}</td>
                      <td className="border border-slate-300 px-3 py-2">{row.workType}</td>
                      <td className="border border-slate-300 px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${trainingColor(row.status)}`}>{row.title}</span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2">
                        {row.trainer ? (
                          <div>
                            <p className="font-medium">{trainerNameOf(row.trainer)}</p>
                            <p className="text-xs text-slate-500">{row.trainer}</p>
                          </div>
                        ) : (
                          'Waiting for a trainer'
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-rose-800">
                        {row.cancelledSessions.length ? (
                          <div className="space-y-1">
                            {row.cancelledSessions.map((session) => (
                              <p key={session.Session_ID}>
                                {session.Session_Title || 'Session'}:{' '}
                                {sessionCancelReason(session) || 'No reason recorded'}
                              </p>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-slate-600">
                        {row.status === 'Completed' ? formatDate(row.client.Completed_Date) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
