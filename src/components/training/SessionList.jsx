import { useCrmStore } from '../../store/crmStore';
import { formatDateTime, sessionColor } from '../../utils/constants';

export default function SessionList({ clientId, compact = false }) {
  const { sessions, clients, completeSession, updateSession } = useCrmStore();
  const rows = sessions
    .filter((session) => !clientId || session.Client_ID === clientId)
    .sort((a, b) => new Date(a.Start_Time) - new Date(b.Start_Time));

  const clientName = (id) => clients.find((client) => client.Client_ID === id)?.Client_Name || id;

  if (!rows.length) {
    return <p className="text-sm text-slate-500">No sessions yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {!compact ? <th className="px-3 py-2">Client</th> : null}
            <th className="px-3 py-2">Session</th>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Trainer</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((session) => (
            <tr key={session.Session_ID} className="border-t border-slate-100">
              {!compact ? <td className="px-3 py-2">{clientName(session.Client_ID)}</td> : null}
              <td className="px-3 py-2">
                <p>{session.Session_Title}</p>
                <p className="text-xs text-slate-500">{session.Session_ID}</p>
              </td>
              <td className="px-3 py-2">
                {formatDateTime(session.Start_Time)}
                <p className="text-xs text-slate-500">to {formatDateTime(session.End_Time)}</p>
              </td>
              <td className="px-3 py-2">{session.Trainer_Email}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
