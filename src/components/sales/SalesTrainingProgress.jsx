import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import {
  TRAINING_STATUSES,
  findLeadForClient,
  normalizeTrainingStatus,
  trainerLabel,
  trainingColor,
} from '../../utils/constants';

export default function SalesTrainingProgress({ compact = false, ribbon = false }) {
  const { user, privileges } = useAuth();
  const { clients, leads } = useCrmStore();
  const [status, setStatus] = useState('All');

  const mine = useMemo(() => {
    const rows = clients.filter((client) => {
      if (privileges.admin || privileges.teamLead) return true;
      const lead = findLeadForClient(leads, client);
      const owner = String(lead?.Executive || '').trim().toLowerCase();
      const me = String(user?.name || '').trim().toLowerCase();
      const email = String(user?.email || '').trim().toLowerCase();
      if (!owner) return true;
      return owner === me || owner === email;
    });
    return rows.sort((a, b) => String(a.Client_Name || '').localeCompare(String(b.Client_Name || '')));
  }, [clients, leads, privileges.admin, privileges.teamLead, user?.email, user?.name]);

  const grouped = useMemo(
    () =>
      TRAINING_STATUSES.map((item) => ({
        status: item,
        rows: mine.filter((client) => normalizeTrainingStatus(client.Training_Status) === item),
      })),
    [mine]
  );

  const visible = grouped.filter((group) => status === 'All' || group.status === status);
  const counts = Object.fromEntries(grouped.map((group) => [group.status, group.rows.length]));

  if (ribbon) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sky-950">Client training</p>
          <p className="text-[11px] text-sky-800">
            {privileges.admin || privileges.teamLead
              ? 'Training progress for all clients passed from sales.'
              : 'Training progress for the clients you passed to the technical team.'}
          </p>
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
          <h2 className={compact ? 'text-sm font-semibold' : 'text-lg font-semibold'}>Client training</h2>
          <p className="text-xs text-slate-500">
            {privileges.admin || privileges.teamLead
              ? 'Training progress for all clients passed from sales.'
              : 'Training progress for the clients you passed to the technical team.'}
          </p>
        </div>
        {!compact ? (
          <label className="text-xs font-medium text-slate-600">
            Status
            <select
              className="mt-1 block rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="All">All statuses</option>
              {TRAINING_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'md:grid-cols-3'}`}>
        {TRAINING_STATUSES.map((item) => (
          <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{item}</p>
            <p className="text-lg font-semibold text-slate-800">{counts[item] || 0}</p>
          </div>
        ))}
      </div>

      {compact ? (
        <p className="mt-3 text-xs text-slate-500">Open the Client training tab for the full list by status.</p>
      ) : null}

      {compact ? null : (
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {visible.map((group) => (
          <article key={group.status} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{group.status}</p>
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${trainingColor(group.status)}`}>
                {group.rows.length}
              </span>
            </div>
            {group.rows.length === 0 ? (
              <p className="text-xs text-slate-400">No clients.</p>
            ) : (
              <div className={compact ? 'max-h-[180px] space-y-2 overflow-auto' : 'space-y-2'}>
                {group.rows.map((client) => {
                  const lead = findLeadForClient(leads, client);
                  return (
                    <div key={client.Client_ID} className="rounded border border-slate-100 px-2 py-2">
                      <p className="truncate text-sm font-medium">{client.Client_Name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {lead?.Executive ? `${lead.Executive} · ` : ''}
                        {client.Work_Type || 'Training'}
                      </p>
                      {client.Assigned_Trainer ? (
                        <p className="mt-1 truncate text-[11px] text-sky-800">
                          Trainer: {trainerLabel(client.Assigned_Trainer)}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-amber-700">Waiting for a trainer</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        ))}
      </div>
      )}
    </section>
  );
}
