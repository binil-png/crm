import {
  PIPELINE_STATUSES,
  formatScheduleRelative,
  getCallScheduleState,
  getLeadScheduleAt,
} from '../../utils/constants';

const GROUPS = [
  { id: 'overdue', label: 'Overdue', empty: 'No overdue calls.' },
  { id: 'soon', label: 'Starting soon', empty: 'No calls in the next 5 minutes.' },
  { id: 'upcoming', label: 'Upcoming', empty: 'No upcoming calls.' },
];

const tone = {
  overdue: 'border-rose-200 bg-rose-50',
  soon: 'border-amber-200 bg-amber-50',
  upcoming: 'border-sky-200 bg-sky-50',
};

const badge = {
  overdue: 'bg-rose-100 text-rose-800',
  soon: 'bg-amber-100 text-amber-800',
  upcoming: 'bg-sky-100 text-sky-800',
};

export default function CallScheduleSidebar({
  leads,
  now,
  onSelect,
  onCompleteCall,
  onChangeStatus,
  canEdit = false,
}) {
  const grouped = {
    overdue: [],
    soon: [],
    upcoming: [],
  };

  leads.forEach((lead) => {
    const state = getCallScheduleState(lead, now);
    if (grouped[state]) grouped[state].push(lead);
  });

  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => (getLeadScheduleAt(a)?.getTime() || 0) - (getLeadScheduleAt(b)?.getTime() || 0));
  });

  const scheduledCount = grouped.overdue.length + grouped.soon.length + grouped.upcoming.length;

  return (
    <aside className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Call schedule</h3>
        <p className="text-xs text-slate-500">
          {scheduledCount === 1 ? '1 open lead with a time' : `${scheduledCount} open leads with a time`}
        </p>
      </div>

      <div className="space-y-4">
        {GROUPS.map((group) => (
          <section key={group.id}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{group.label}</p>
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${badge[group.id]}`}>{grouped[group.id].length}</span>
            </div>
            {grouped[group.id].length === 0 ? (
              <p className="text-xs text-slate-400">{group.empty}</p>
            ) : (
              <div className="space-y-2">
                {grouped[group.id].map((lead) => {
                  const at = getLeadScheduleAt(lead);
                  return (
                    <div
                      key={`${lead._sheet}-${lead['Sl No']}`}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left ${tone[group.id]}`}
                    >
                      <button type="button" onClick={() => onSelect(lead)} className="w-full text-left">
                        <p className="truncate text-sm font-medium">{lead['Customer Name']}</p>
                        <p className="truncate text-xs text-slate-600">
                          {lead.Status}
                          {lead['Contact Number'] ? ` · ${lead['Contact Number']}` : ''}
                        </p>
                        <p className="mt-1 text-xs font-medium">{at ? at.toLocaleString() : '—'}</p>
                        <p className="text-[11px] text-slate-500">{formatScheduleRelative(at, now)}</p>
                      </button>
                      {canEdit && group.id === 'overdue' ? (
                        <div className="mt-2 space-y-2" onClick={(event) => event.stopPropagation()}>
                          <select
                            className="w-full rounded border border-rose-200 bg-white px-2 py-1 text-xs"
                            value={lead.Status || 'New'}
                            onChange={(event) => onChangeStatus?.(lead, event.target.value)}
                          >
                            {PIPELINE_STATUSES.map((item) => (
                              <option key={item}>{item}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="w-full rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
                            onClick={() => onCompleteCall?.(lead)}
                          >
                            Mark call done
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </aside>
  );
}
