import {
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

export default function CallScheduleSidebar({ leads, now, onSelect }) {
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
    <aside className="rounded-lg border border-slate-200 bg-white p-3 lg:sticky lg:top-20">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Call schedule</h3>
        <p className="text-xs text-slate-500">
          {scheduledCount === 1 ? '1 open lead with a time' : `${scheduledCount} open leads with a time`}
        </p>
      </div>

      <div className="max-h-[70vh] space-y-4 overflow-auto">
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
                    <button
                      key={`${lead._sheet}-${lead['Sl No']}`}
                      type="button"
                      onClick={() => onSelect(lead)}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left ${tone[group.id]}`}
                    >
                      <p className="truncate text-sm font-medium">{lead['Customer Name']}</p>
                      <p className="truncate text-xs text-slate-600">
                        {lead.Status}
                        {lead['Contact Number'] ? ` · ${lead['Contact Number']}` : ''}
                      </p>
                      <p className="mt-1 text-xs font-medium">
                        {at ? at.toLocaleString() : '—'}
                      </p>
                      <p className="text-[11px] text-slate-500">{formatScheduleRelative(at, now)}</p>
                    </button>
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
