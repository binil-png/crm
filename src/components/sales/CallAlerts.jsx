import { AlertTriangle, Bell } from 'lucide-react';
import {
  formatScheduleRelative,
  getCallScheduleState,
  getLeadScheduleAt,
} from '../../utils/constants';

export default function CallAlerts({ leads, now, onSelect }) {
  const overdue = leads.filter((lead) => getCallScheduleState(lead, now) === 'overdue');
  const soon = leads.filter((lead) => getCallScheduleState(lead, now) === 'soon');

  if (!overdue.length && !soon.length) return null;

  return (
    <div className="mb-4 space-y-2">
      {overdue.length ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <p className="mb-1 inline-flex items-center gap-1.5 font-medium">
            <AlertTriangle size={16} />
            Overdue calls ({overdue.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {overdue.map((lead) => (
              <button
                key={`${lead._sheet}-${lead['Sl No']}`}
                type="button"
                className="rounded bg-white px-2 py-1 text-left text-xs text-rose-800"
                onClick={() => onSelect(lead)}
              >
                {lead['Customer Name']} · {formatScheduleRelative(getLeadScheduleAt(lead), now)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {soon.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="mb-1 inline-flex items-center gap-1.5 font-medium">
            <Bell size={16} />
            Starting within 5 minutes
          </p>
          <div className="flex flex-wrap gap-2">
            {soon.map((lead) => {
              const at = getLeadScheduleAt(lead);
              return (
                <button
                  key={`${lead._sheet}-${lead['Sl No']}`}
                  type="button"
                  className="rounded bg-white px-2 py-1 text-left text-xs text-amber-900"
                  onClick={() => onSelect(lead)}
                >
                  Call {lead['Customer Name']} {formatScheduleRelative(at, now)}
                  {lead['Contact Number'] ? ` · ${lead['Contact Number']}` : ''}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
